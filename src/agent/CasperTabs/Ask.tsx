/**
 * Ask Tab
 * Freeform question & answer tab for the Casper AI agent
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { theme } from "../../theme";
import {
  getKeyboardBehavior,
  getCasperKeyboardOffset,
} from "../../lib/keyboardUtils";
import { useCasper } from "../useCasper";
import { useCasperContext } from "../CasperContext";
import { answerQuery, validateQuery, QAAnswer } from "../qa/controller";
import {
  logSession,
  getConversationSessions,
  clearConversationSessions,
} from "../qa/sessionLogger";
import { Sources } from "../components/Sources";
import { TranslationResult } from "../components/TranslationResult";
import {
  handleTranslationRequest,
  handleMessageCompositionRequest,
  handleTranslationAndSendRequest,
  parseTranslationRequest,
  TranslationRequest,
  MessageCompositionRequest,
  TranslationAndSendRequest,
} from "../translation/controller";

interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  sources: any[];
  mode: "template" | "llm";
  timestamp: number;
  error?: string;
  status?: "queued" | "processing" | "completed" | "error";
  // Translation and composition results
  translationResult?: {
    type: "translation" | "generated_response";
    originalText?: string;
    translatedText?: string;
    generatedResponse?: string;
    targetLanguage?: string;
    sourceLanguage?: string;
  };
}

export const AskTab: React.FC = () => {
  const { state } = useCasper();
  const { context, flags, rateLimiter, setError, clearError } =
    useCasperContext();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<QAHistoryItem[]>([]);
  const [fullHistory, setFullHistory] = useState<QAHistoryItem[]>([]);
  const [displayCount, setDisplayCount] = useState(5);
  const [questionQueue, setQuestionQueue] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUserActivity, setLastUserActivity] = useState<number>(Date.now());
  const [followupTimer, setFollowupTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [hasShownFollowup, setHasShownFollowup] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const shouldAutoScrollRef = useRef(true);

  // Load recent sessions on mount or when conversation changes
  useEffect(() => {
    if (state.context.cid) {
      loadRecentSessions();
    } else {
      setHistory([]);
      setFullHistory([]);
      setDisplayCount(5);
    }
  }, [state.context.cid]);

  // Update visible history when displayCount changes
  useEffect(() => {
    if (fullHistory.length > 0) {
      const startIndex = Math.max(0, fullHistory.length - displayCount);
      setHistory(fullHistory.slice(startIndex));
    }
  }, [displayCount, fullHistory]);

  // Process question queue
  useEffect(() => {
    if (questionQueue.length > 0 && !isProcessing && state.context.cid) {
      processNextQuestion();
    }
  }, [questionQueue, isProcessing, state.context.cid]);

  // Auto-scroll to bottom when history changes (but not when loading more)
  useEffect(() => {
    if (history.length > 0 && shouldAutoScrollRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [history]);

  // Ensure scroll to bottom when Casper first opens with a conversation
  useEffect(() => {
    if (state.context.cid && history.length > 0) {
      // Use a longer timeout to ensure the ScrollView is fully rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 500);
    }
  }, [state.context.cid, history.length]);

  // Followup timer - show followup message if user hasn't responded in 2 minutes
  useEffect(() => {
    if (!state.context.cid || isProcessing || questionQueue.length > 0) {
      return;
    }

    // Clear existing timer
    if (followupTimer) {
      clearTimeout(followupTimer);
      setFollowupTimer(null);
    }

    // Only start followup timer if we have history and haven't shown followup yet
    if (history.length > 0 && !hasShownFollowup) {
      const timer = setTimeout(() => {
        const timeSinceActivity = Date.now() - lastUserActivity;
        const FOLLOWUP_DELAY = 2 * 60 * 1000; // 2 minutes

        if (
          timeSinceActivity >= FOLLOWUP_DELAY &&
          !isProcessing &&
          questionQueue.length === 0
        ) {
          showFollowupMessage();
        }
      }, 2 * 60 * 1000) as any; // Check after 2 minutes

      setFollowupTimer(timer);
    }

    // Cleanup timer on unmount
    return () => {
      if (followupTimer) {
        clearTimeout(followupTimer);
      }
    };
  }, [
    lastUserActivity,
    isProcessing,
    questionQueue.length,
    history.length,
    hasShownFollowup,
    state.context.cid,
  ]);

  const loadRecentSessions = async () => {
    if (!state.context.cid) return;

    try {
      const sessions = await getConversationSessions(state.context.cid);
      const historyItems: QAHistoryItem[] = sessions
        .map((session) => ({
          id: session.id,
          question: session.question,
          answer: session.answer,
          sources: [], // Don't reload sources for cached sessions
          mode: session.mode,
          timestamp: session.timestamp,
        }))
        .reverse(); // Reverse to show oldest first (like chat)

      setFullHistory(historyItems);
      // Only show last 5 initially
      const startIndex = Math.max(0, historyItems.length - 5);
      setHistory(historyItems.slice(startIndex));
      setDisplayCount(5);

      // Ensure we scroll to bottom after loading initial history
      if (historyItems.length > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 200);
      }
    } catch (error) {
      console.error("Error loading recent sessions:", error);
    }
  };

  const loadMoreExchanges = () => {
    // Disable auto-scroll temporarily
    shouldAutoScrollRef.current = false;
    // Load 3 more exchanges, but cap at fullHistory.length
    // When displayCount reaches fullHistory.length, the CTA will disappear
    setDisplayCount((prev) => Math.min(prev + 3, fullHistory.length));
    // Re-enable auto-scroll after a short delay
    setTimeout(() => {
      shouldAutoScrollRef.current = true;
    }, 300);
  };

  const handleClearHistory = async () => {
    if (!state.context.cid) return;

    try {
      await clearConversationSessions(state.context.cid);
      setHistory([]);
      setFullHistory([]);
      setDisplayCount(5);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const showFollowupMessage = () => {
    if (!state.context.cid || hasShownFollowup) return;

    const followupMessages = [
      "Is there anything else I can help you with?",
      "Would you like to ask another question?",
      "Do you need clarification on anything?",
      "Feel free to ask me anything else!",
      "I'm here if you have more questions.",
    ];

    const randomMessage =
      followupMessages[Math.floor(Math.random() * followupMessages.length)];

    const followupItem: QAHistoryItem = {
      id: `followup_${Date.now()}`,
      question: "",
      answer: randomMessage,
      sources: [],
      mode: "template",
      timestamp: Date.now(),
      status: "completed",
    };

    setFullHistory((prev) => [...prev, followupItem]);
    setHistory((prev) => [...prev, followupItem]);
    setHasShownFollowup(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!query.trim() || !state.context.cid) {
      return;
    }

    // Update user activity and reset followup state
    setLastUserActivity(Date.now());
    setHasShownFollowup(false);

    // Clear followup timer
    if (followupTimer) {
      clearTimeout(followupTimer);
      setFollowupTimer(null);
    }

    // Validate query
    const validation = validateQuery(query);
    if (!validation.valid) {
      setError(validation.error || "Invalid question");
      return;
    }

    // Check rate limit
    if (!rateLimiter.canProceed()) {
      setError("Rate limit reached. Please wait a minute before asking again.");
      return;
    }

    // Record attempt
    rateLimiter.recordAttempt();
    clearError();

    const currentQuery = query;
    setQuery("");

    // Add queued item to history immediately
    const queuedItem: QAHistoryItem = {
      id: `qa_${Date.now()}_${Math.random()}`,
      question: currentQuery,
      answer: "",
      sources: [],
      mode: "template",
      timestamp: Date.now(),
      status: "queued",
    };

    setFullHistory((prev) => [...prev, queuedItem]);
    setHistory((prev) => [...prev, queuedItem]);

    // Add to queue
    setQuestionQueue((prev) => [...prev, currentQuery]);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const processNextQuestion = async () => {
    if (questionQueue.length === 0 || !state.context.cid) return;

    setIsProcessing(true);
    const currentQuery = questionQueue[0];

    // Update status to processing
    setHistory((prev) =>
      prev.map((item) =>
        item.question === currentQuery && item.status === "queued"
          ? { ...item, status: "processing" as const }
          : item
      )
    );
    setFullHistory((prev) =>
      prev.map((item) =>
        item.question === currentQuery && item.status === "queued"
          ? { ...item, status: "processing" as const }
          : item
      )
    );

    const startTime = Date.now();

    try {
      // Parse the query to determine if it's a translation/composition request
      const parsedRequest = parseTranslationRequest(currentQuery);
      console.log("Parsed request:", parsedRequest);

      if (parsedRequest.type === "translate") {
        // Handle translation request
        const translationRequest: TranslationRequest = {
          text: parsedRequest.text || "",
          targetLanguage: parsedRequest.targetLanguage || "",
          sourceLanguage: parsedRequest.sourceLanguage,
        };

        const result = await handleTranslationRequest(translationRequest);

        // Update history with translation result
        const updateItem = (item: QAHistoryItem) => {
          if (item.question === currentQuery && item.status === "processing") {
            return {
              ...item,
              answer: `Translated to ${result.targetLanguage}`,
              mode: "llm" as const,
              timestamp: Date.now(),
              status: "completed" as const,
              translationResult: {
                type: "translation" as const,
                originalText: result.originalText,
                translatedText: result.translatedText,
                targetLanguage: result.targetLanguage,
                sourceLanguage: result.sourceLanguage,
              },
            };
          }
          return item;
        };

        setFullHistory((prev) => prev.map(updateItem));
        setHistory((prev) => prev.map(updateItem));

        // Log session
        await logSession(
          state.context.cid,
          currentQuery,
          `Translated to ${result.targetLanguage}`,
          "llm",
          0,
          Date.now() - startTime
        );
      } else if (parsedRequest.type === "translate_and_send") {
        console.log("Processing translate_and_send request");
        // Handle translation and send request
        const translationAndSendRequest: TranslationAndSendRequest = {
          text: parsedRequest.text || "",
          targetLanguage: parsedRequest.targetLanguage || "",
          conversationId: state.context.cid,
          sourceLanguage: parsedRequest.sourceLanguage,
        };

        console.log("Translation and send request:", translationAndSendRequest);
        const result = await handleTranslationAndSendRequest(
          translationAndSendRequest
        );
        console.log("Translation and send result:", result);

        // Update history with translation and send result
        const updateItem = (item: QAHistoryItem) => {
          if (item.question === currentQuery && item.status === "processing") {
            return {
              ...item,
              answer: `Message translated to ${result.targetLanguage} and sent successfully`,
              mode: "llm" as const,
              timestamp: Date.now(),
              status: "completed" as const,
              // Don't show translationResult for translate_and_send - message is already sent
            };
          }
          return item;
        };

        setFullHistory((prev) => prev.map(updateItem));
        setHistory((prev) => prev.map(updateItem));

        // Log session
        await logSession(
          state.context.cid,
          currentQuery,
          `Message translated to ${result.targetLanguage} and sent`,
          "llm",
          0,
          Date.now() - startTime
        );
      } else if (parsedRequest.type === "generate_response") {
        // Handle message composition request
        const compositionRequest: MessageCompositionRequest = {
          conversationId: state.context.cid,
          context: parsedRequest.context,
        };

        const result = await handleMessageCompositionRequest(
          compositionRequest
        );

        // Update history with composition result
        const updateItem = (item: QAHistoryItem) => {
          if (item.question === currentQuery && item.status === "processing") {
            return {
              ...item,
              answer: "Generated contextual response",
              mode: "llm" as const,
              timestamp: Date.now(),
              status: "completed" as const,
              translationResult: {
                type: "generated_response" as const,
                generatedResponse: result.generatedResponse,
              },
            };
          }
          return item;
        };

        setFullHistory((prev) => prev.map(updateItem));
        setHistory((prev) => prev.map(updateItem));

        // Log session
        await logSession(
          state.context.cid,
          currentQuery,
          "Generated contextual response",
          "llm",
          0,
          Date.now() - startTime
        );
      } else {
        // Handle regular Q&A request
        const result: QAAnswer = await answerQuery(
          currentQuery,
          state.context.cid,
          8
        );

        const duration = Date.now() - startTime;

        // Update history with result
        const updateItem = (item: QAHistoryItem) => {
          if (item.question === currentQuery && item.status === "processing") {
            return {
              ...item,
              answer: result.answer,
              sources: result.sources,
              mode: result.mode,
              timestamp: result.timestamp,
              status: "completed" as const,
            };
          }
          return item;
        };

        setFullHistory((prev) => prev.map(updateItem));
        setHistory((prev) => prev.map(updateItem));

        // Log session
        await logSession(
          state.context.cid,
          currentQuery,
          result.answer,
          result.mode,
          result.sources.length,
          duration
        );
      }

      // Scroll to bottom after state updates
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error) {
      console.error("Error processing question:", error);

      let errorMessage = "Failed to process request";

      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes("unauthenticated")) {
          errorMessage = "Please sign in to use this feature";
        } else if (error.message.includes("invalid-argument")) {
          errorMessage = "Invalid request format. Please check your input";
        } else if (
          error.message.includes("rate-limit") ||
          error.message.includes("too many requests")
        ) {
          errorMessage =
            "Too many requests. Please wait a moment and try again";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "Network error. Please check your connection";
        } else if (error.message.includes("translation")) {
          errorMessage = "Translation service is temporarily unavailable";
        } else if (
          error.message.includes("openai") ||
          error.message.includes("api")
        ) {
          errorMessage = "AI service is temporarily unavailable";
        } else {
          errorMessage = error.message;
        }
      }

      // Update history with error
      const updateItem = (item: QAHistoryItem) => {
        if (item.question === currentQuery && item.status === "processing") {
          return {
            ...item,
            status: "error" as const,
            error: errorMessage,
          };
        }
        return item;
      };

      setFullHistory((prev) => prev.map(updateItem));
      setHistory((prev) => prev.map(updateItem));
      setError(errorMessage);
    } finally {
      // Remove from queue
      setQuestionQueue((prev) => prev.slice(1));
      setIsProcessing(false);
    }
  };

  const handleRetry = (question: string) => {
    setQuery(question);
    // Will trigger send when user presses send button
  };

  const remainingAttempts = rateLimiter.getRemainingAttempts();
  const canSend = query.trim().length > 0 && remainingAttempts > 0; // Removed !loading check

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getCasperKeyboardOffset()}
    >
      {!state.context.cid ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="message-question-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyText}>Pick a conversation</Text>
          <Text style={styles.emptySubtext}>
            Open a conversation to ask questions about its content
          </Text>
        </View>
      ) : (
        <>
          {/* Header with Clear Button */}
          {history.length > 0 && (
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearHistory}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.clearButtonText}>Clear History</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content Area - Q&A history */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            keyboardShouldPersistTaps="handled"
          >
            {history.length === 0 ? (
              <View style={styles.placeholder}>
                <MaterialCommunityIcons
                  name="robot-outline"
                  size={48}
                  color={theme.colors.amethystGlow}
                />
                <Text style={styles.placeholderText}>Ask Casper anything</Text>
                <Text style={styles.placeholderSubtext}>
                  Ask questions about this conversation, translate messages, or
                  generate responses
                </Text>

                {/* Feature Examples */}
                <View style={styles.examplesContainer}>
                  <Text style={styles.examplesTitle}>Try these commands:</Text>
                  <Text style={styles.exampleText}>
                    • "translate this message to Spanish: hello"
                  </Text>
                  <Text style={styles.exampleText}>
                    • "translate to French and send it: when are you available?"
                  </Text>
                  <Text style={styles.exampleText}>
                    • "write a response to John based on our conversation"
                  </Text>
                  <Text style={styles.exampleText}>
                    • "what language is this: bonjour"
                  </Text>
                </View>

                {!flags.enableLLM && (
                  <View style={styles.infoBox}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.infoText}>
                      LLM is disabled. Answers will be template-based.
                    </Text>
                  </View>
                )}

                {remainingAttempts <= 3 && (
                  <View style={styles.warningBox}>
                    <MaterialCommunityIcons
                      name="alert-outline"
                      size={20}
                      color="#FFA500"
                    />
                    <Text style={styles.warningText}>
                      {remainingAttempts} questions remaining this minute
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* Load More Button - only show if there are more exchanges to load */}
                {fullHistory.length > displayCount && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMoreExchanges}
                  >
                    <MaterialCommunityIcons
                      name="chevron-up"
                      size={20}
                      color={theme.colors.amethystGlow}
                    />
                    <Text style={styles.loadMoreText}>
                      Load older exchanges...
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Q&A History */}
                {history.map((item) => (
                  <View key={item.id} style={styles.qaItem}>
                    {/* Question - only show if not a followup message */}
                    {!item.id.startsWith("followup_") && item.question && (
                      <View style={styles.questionContainer}>
                        <View style={styles.questionBubble}>
                          <Text style={styles.questionText}>
                            {item.question}
                          </Text>
                        </View>
                        <MaterialCommunityIcons
                          name="account-circle"
                          size={24}
                          color={theme.colors.text}
                        />
                      </View>
                    )}

                    {/* Followup Message Indicator */}
                    {item.id.startsWith("followup_") && (
                      <View style={styles.followupContainer}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={20}
                          color={theme.colors.amethystGlow}
                        />
                        <Text style={styles.followupLabel}>Casper</Text>
                      </View>
                    )}

                    {/* Answer or Error */}
                    {item.status === "queued" ? (
                      <View style={styles.answerContainer}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={24}
                          color={theme.colors.textSecondary}
                        />
                        <View style={styles.answerBubble}>
                          <View style={styles.queuedIndicator}>
                            <MaterialCommunityIcons
                              name="clock-outline"
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.queuedText}>Queued...</Text>
                          </View>
                        </View>
                      </View>
                    ) : item.status === "processing" ? (
                      <View style={styles.answerContainer}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={24}
                          color={theme.colors.amethystGlow}
                        />
                        <View style={styles.answerBubble}>
                          <View style={styles.processingIndicator}>
                            <ActivityIndicator
                              size="small"
                              color={theme.colors.amethystGlow}
                            />
                            <Text style={styles.processingText}>
                              Thinking...
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : item.error ? (
                      <View style={styles.answerContainer}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={24}
                          color="#C62828"
                        />
                        <View style={styles.errorAnswerBubble}>
                          <Text style={styles.errorAnswerText}>
                            ❌ {item.error}
                          </Text>
                          <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => handleRetry(item.question)}
                          >
                            <MaterialCommunityIcons
                              name="refresh"
                              size={16}
                              color={theme.colors.amethystGlow}
                            />
                            <Text style={styles.retryText}>Retry</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.answerContainer}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={24}
                          color={theme.colors.amethystGlow}
                        />
                        <View style={styles.answerBubble}>
                          <Text style={styles.answerText}>{item.answer}</Text>

                          {/* Translation Result */}
                          {item.translationResult && (
                            <View style={styles.translationContainer}>
                              <TranslationResult
                                type={item.translationResult.type}
                                originalText={
                                  item.translationResult.originalText
                                }
                                translatedText={
                                  item.translationResult.translatedText
                                }
                                generatedResponse={
                                  item.translationResult.generatedResponse
                                }
                                targetLanguage={
                                  item.translationResult.targetLanguage
                                }
                                sourceLanguage={
                                  item.translationResult.sourceLanguage
                                }
                                conversationId={state.context.cid || ""}
                                onSend={(messageId) => {
                                  console.log("Message sent:", messageId);
                                }}
                                onEdit={() => {
                                  // Handle edit functionality
                                  console.log("Edit requested");
                                }}
                              />
                            </View>
                          )}

                          {/* Mode Badge */}
                          <View style={styles.modeBadge}>
                            <MaterialCommunityIcons
                              name={
                                item.mode === "llm"
                                  ? "brain"
                                  : "file-document-outline"
                              }
                              size={12}
                              color={theme.colors.textSecondary}
                            />
                            <Text style={styles.modeText}>
                              {item.mode === "llm" ? "AI" : "Template"}
                            </Text>
                          </View>

                          {/* Sources */}
                          {item.sources.length > 0 && (
                            <View style={styles.sourcesContainer}>
                              <Sources
                                sources={item.sources}
                                collapsed={true}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* Error display at bottom */}
            {context.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{context.error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ask a question..."
                placeholderTextColor={theme.colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                multiline
                maxLength={500}
                editable={!context.loading}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!canSend || context.loading}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={canSend ? "#FFFFFF" : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {query.length}/500 • Rate limit: {remainingAttempts}/10 per minute
            </Text>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  clearButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: theme.spacing.lg,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  loadMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  placeholderSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  examplesContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  examplesTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  exampleText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontFamily: "monospace",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: "#FFF8E1",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  warningText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#F57C00",
    flex: 1,
  },
  errorBox: {
    backgroundColor: "#FFEBEE",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#C62828",
  },
  inputContainer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  hint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  qaItem: {
    marginBottom: theme.spacing.lg,
  },
  followupContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  followupLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.amethystGlow,
  },
  questionContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    alignItems: "flex-start",
  },
  questionBubble: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  questionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 22,
  },
  answerContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "flex-start",
  },
  answerBubble: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.amethystGlow + "30",
  },
  answerText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 22,
  },
  queuedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  queuedText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  processingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  processingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontStyle: "italic",
  },
  errorAnswerBubble: {
    flex: 1,
    backgroundColor: "#FFEBEE",
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorAnswerText: {
    fontSize: theme.typography.fontSize.base,
    color: "#C62828",
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: theme.colors.amethystGlow,
  },
  retryText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    alignSelf: "flex-start",
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  modeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  sourcesContainer: {
    marginTop: theme.spacing.md,
  },
  translationContainer: {
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});
