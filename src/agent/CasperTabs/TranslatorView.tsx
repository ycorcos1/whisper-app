/**
 * Translator View Component
 * Main interface for translator mode - replaces normal Ask view
 * Shows chat-like interface with auto-translated messages
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import {
  getKeyboardBehavior,
  getCasperKeyboardOffset,
} from "../../lib/keyboardUtils";
import { useCasper } from "../useCasper";
import { useAuth } from "../../state/auth/useAuth";
import {
  SupportedLanguage,
  TranslatedMessage as TranslatedMessageType,
} from "../translation/types";
import { LanguageSelector } from "../components/LanguageSelector";
import { TranslatedMessage } from "../components/TranslatedMessage";
import {
  detectConversationLanguage,
  detectMessageLanguage,
  clearConversationCache,
} from "../translation/languageDetector";
import {
  translateMessageWithCache,
  isTranslationNeeded,
} from "../translation/translationService";
import { translateMessage } from "../../services/translationApi";
import {
  firebaseFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  getDoc,
  doc,
} from "../../lib/firebase";
import { sendMessage as sendMessageToConversation } from "../../features/messages/api";

interface TranslatorViewProps {
  targetLanguage: SupportedLanguage;
  setTargetLanguage: (language: SupportedLanguage) => void;
  onDisable: () => void;
}

export const TranslatorView: React.FC<TranslatorViewProps> = ({
  targetLanguage,
  setTargetLanguage,
  onDisable,
}) => {
  const { state } = useCasper();
  const { user } = useAuth();
  const [messages, setMessages] = useState<TranslatedMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [conversationLanguage, setConversationLanguage] =
    useState<string>("English");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const conversationId = state.context.cid;

  // Use ref to track latest conversation language (avoids stale closure issues)
  const conversationLanguageRef = useRef<string>("English");

  // Persist and load target language preference
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem("@translator_target_language");
        if (
          saved &&
          ["English", "Spanish", "French", "Italian"].includes(saved)
        ) {
          setTargetLanguage(saved as SupportedLanguage);
        }
      } catch (error) {
        console.error("Error loading language preference:", error);
      }
    };
    loadLanguagePreference();
  }, []);

  useEffect(() => {
    const saveLanguagePreference = async () => {
      try {
        await AsyncStorage.setItem(
          "@translator_target_language",
          targetLanguage
        );
      } catch (error) {
        console.error("Error saving language preference:", error);
      }
    };
    saveLanguagePreference();
  }, [targetLanguage]);

  // Load messages on mount or conversation change
  // Note: We don't call detectLanguage() here because language detection
  // happens automatically as messages load and from real-time updates
  useEffect(() => {
    if (conversationId && user) {
      loadMessages();
    }

    return () => {
      // Cleanup on unmount
      if (conversationId) {
        clearConversationCache(conversationId);
      }
    };
  }, [conversationId, user]);

  // Re-translate when target language changes
  useEffect(() => {
    if (messages.length > 0) {
      reTranslateMessages();
    }
  }, [targetLanguage]);

  // Listen for new messages
  useEffect(() => {
    // Don't set up listener if no conversation or no user
    if (!conversationId || !user) return;

    const messagesRef = collection(
      firebaseFirestore,
      "conversations",
      conversationId,
      "messages"
    );
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const messageData = change.doc.data();

            // Skip own messages (they're added optimistically)
            if (messageData.senderId === user?.uid) return;

            // Translate and add to messages
            await handleNewMessage(change.doc.id, messageData);
          }
        });
      },
      (error) => {
        // Handle listener errors (e.g., permissions denied on logout)
        console.warn("Message listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [conversationId, user, targetLanguage]);

  /**
   * Detect conversation language
   */
  const detectLanguage = async () => {
    if (!conversationId || !user) return;

    try {
      const detected = await detectConversationLanguage(
        conversationId,
        user.uid
      );
      console.log("🌍 Initial conversation language detected:", detected);
      setConversationLanguage(detected);
      conversationLanguageRef.current = detected; // Update ref
    } catch (error) {
      console.error("Error detecting language:", error);
      setConversationLanguage("English");
      conversationLanguageRef.current = "English"; // Update ref
    }
  };

  /**
   * Load message history
   */
  const loadMessages = async () => {
    if (!conversationId || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch last 50 messages
      const messagesRef = collection(
        firebaseFirestore,
        "conversations",
        conversationId,
        "messages"
      );
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(50));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      // Process messages
      const translatedMessages: TranslatedMessageType[] = [];

      for (const docSnapshot of snapshot.docs.reverse()) {
        const messageData = docSnapshot.data();

        // Skip messages without text (deleted or invalid messages)
        if (!messageData.text || messageData.text.trim().length === 0) {
          continue;
        }

        // Get sender name
        let senderName = "Unknown";
        if (messageData.senderId) {
          try {
            const userDoc = await getDoc(
              doc(firebaseFirestore, "users", messageData.senderId)
            );
            if (userDoc.exists()) {
              senderName = userDoc.data()?.displayName || "Unknown";
            }
          } catch (err) {
            console.warn("Error fetching sender name:", err);
          }
        }

        // Detect source language
        const sourceLanguage = await detectMessageLanguage(messageData.text);
        const isOwn = messageData.senderId === user.uid;

        // Translate if needed
        let translatedText = messageData.text;
        let translationError: string | undefined;

        if (isTranslationNeeded(sourceLanguage, targetLanguage)) {
          try {
            const result = await translateMessageWithCache(
              docSnapshot.id,
              messageData.text,
              targetLanguage,
              sourceLanguage
            );
            translatedText = result.translatedText;
          } catch (error) {
            console.error("Translation error:", error);
            translationError = (error as Error).message;
          }
        }

        translatedMessages.push({
          id: docSnapshot.id,
          senderId: messageData.senderId,
          senderName,
          originalText: messageData.text,
          translatedText,
          sourceLanguage,
          targetLanguage,
          timestamp: messageData.timestamp?.toMillis() || Date.now(),
          isOwn,
          translationError,
        });
      }

      setMessages(translatedMessages);

      // Detect conversation language from the most recent message from another user
      const lastOtherUserMessage = translatedMessages
        .slice()
        .reverse()
        .find((msg) => !msg.isOwn);

      if (lastOtherUserMessage) {
        const detectedLang = lastOtherUserMessage.sourceLanguage;
        console.log(
          "🌍 Conversation language detected from messages:",
          detectedLang
        );
        setConversationLanguage(detectedLang);
        conversationLanguageRef.current = detectedLang;
      } else {
        console.log("🌍 No messages from other users, defaulting to English");
        setConversationLanguage("English");
        conversationLanguageRef.current = "English";
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
      setError("Failed to load messages. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle new incoming message
   */
  const handleNewMessage = async (messageId: string, messageData: any) => {
    if (!user) return;

    // Skip messages without text (deleted or invalid messages)
    if (!messageData.text || messageData.text.trim().length === 0) {
      return;
    }

    try {
      // Get sender name
      let senderName = "Unknown";
      if (messageData.senderId) {
        try {
          const userDoc = await getDoc(
            doc(firebaseFirestore, "users", messageData.senderId)
          );
          if (userDoc.exists()) {
            senderName = userDoc.data()?.displayName || "Unknown";
          }
        } catch (err) {
          console.warn("Error fetching sender name:", err);
        }
      }

      // Detect language
      const sourceLanguage = await detectMessageLanguage(messageData.text);
      console.log("📨 Incoming message:", {
        text: messageData.text.substring(0, 50),
        detectedLanguage: sourceLanguage,
        senderId: messageData.senderId,
        isOtherUser: messageData.senderId !== user.uid,
      });

      // Update conversation language if this is from another user
      if (messageData.senderId !== user.uid) {
        console.log(
          "🔄 Updating conversation language from",
          conversationLanguageRef.current,
          "to:",
          sourceLanguage
        );
        setConversationLanguage(sourceLanguage);
        conversationLanguageRef.current = sourceLanguage; // Update ref immediately
      }

      // Translate if needed
      let translatedText = messageData.text;
      let translationError: string | undefined;

      if (isTranslationNeeded(sourceLanguage, targetLanguage)) {
        try {
          const result = await translateMessageWithCache(
            messageId,
            messageData.text,
            targetLanguage,
            sourceLanguage
          );
          translatedText = result.translatedText;
        } catch (error) {
          console.error("Translation error:", error);
          translationError = (error as Error).message;
        }
      }

      const translatedMessage: TranslatedMessageType = {
        id: messageId,
        senderId: messageData.senderId,
        senderName,
        originalText: messageData.text,
        translatedText,
        sourceLanguage,
        targetLanguage,
        timestamp: messageData.timestamp?.toMillis() || Date.now(),
        isOwn: false,
        translationError,
      };

      setMessages((prev) => [...prev, translatedMessage]);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error handling new message:", error);
    }
  };

  /**
   * Re-translate all messages to new target language
   */
  const reTranslateMessages = async () => {
    if (!messages.length) return;

    setIsTranslating(true);

    try {
      const reTranslated = await Promise.all(
        messages.map(async (msg) => {
          // Skip if same language
          if (!isTranslationNeeded(msg.sourceLanguage, targetLanguage)) {
            return {
              ...msg,
              translatedText: msg.originalText,
              targetLanguage,
            };
          }

          try {
            const result = await translateMessageWithCache(
              msg.id,
              msg.originalText,
              targetLanguage,
              msg.sourceLanguage
            );

            return {
              ...msg,
              translatedText: result.translatedText,
              targetLanguage,
              translationError: undefined,
            };
          } catch (error) {
            return {
              ...msg,
              targetLanguage,
              translationError: (error as Error).message,
            };
          }
        })
      );

      setMessages(reTranslated);
    } catch (error) {
      console.error("Error re-translating messages:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  /**
   * Handle send message
   */
  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !user || isSending) return;

    const messageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      // Use ref for latest conversation language (fixes stale closure issue)
      const currentConversationLanguage = conversationLanguageRef.current;

      console.log("📤 Sending message:", {
        messageText,
        targetLanguage,
        conversationLanguage: currentConversationLanguage,
      });

      // Check if translation needed and if conversation language is supported
      const isSupportedLanguage = [
        "English",
        "Spanish",
        "French",
        "Italian",
      ].includes(currentConversationLanguage);

      if (
        isTranslationNeeded(targetLanguage, currentConversationLanguage) &&
        isSupportedLanguage
      ) {
        console.log(
          "🌐 Translation needed, translating to:",
          currentConversationLanguage
        );

        // Translate to conversation language using translateMessage API directly
        const result = await translateMessage(
          messageText,
          currentConversationLanguage,
          targetLanguage
        );

        console.log("✅ Translation result:", result.translatedText);

        // Send translated message
        await sendMessageToConversation(conversationId, result.translatedText);

        // Add to local state (optimistic UI)
        const newMessage: TranslatedMessageType = {
          id: `temp_${Date.now()}`,
          senderId: user.uid,
          senderName: user.displayName || "You",
          originalText: messageText,
          translatedText: result.translatedText,
          sourceLanguage: targetLanguage,
          targetLanguage: currentConversationLanguage,
          timestamp: Date.now(),
          isOwn: true,
        };

        setMessages((prev) => [...prev, newMessage]);
      } else {
        console.log("📝 No translation needed, sending as-is");

        // Send as-is (same language or unsupported language)
        await sendMessageToConversation(conversationId, messageText);

        // Add to local state
        const newMessage: TranslatedMessageType = {
          id: `temp_${Date.now()}`,
          senderId: user.uid,
          senderName: user.displayName || "You",
          originalText: messageText,
          translatedText: messageText,
          sourceLanguage: targetLanguage,
          targetLanguage: currentConversationLanguage,
          timestamp: Date.now(),
          isOwn: true,
        };

        setMessages((prev) => [...prev, newMessage]);
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      // Restore input on error
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMessages();
    await detectLanguage();
    setRefreshing(false);
  };

  // Render empty state
  if (!conversationId) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name="translate"
          size={64}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.emptyText}>Select a conversation</Text>
        <Text style={styles.emptySubtext}>
          Open a conversation to use the translator
        </Text>
      </View>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#C62828" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMessages}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getCasperKeyboardOffset()}
    >
      {/* Language selector header */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onDisable}
          accessible={true}
          accessibilityLabel="Exit translator mode"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Translator</Text>
          <Text style={styles.headerSubtitle}>
            Conversation language: {conversationLanguage}
          </Text>
        </View>
        <LanguageSelector
          selectedLanguage={targetLanguage}
          onLanguageChange={setTargetLanguage}
          disabled={isTranslating}
        />
      </View>

      {/* Re-translating indicator */}
      {isTranslating && (
        <View style={styles.translatingBanner}>
          <ActivityIndicator size="small" color={theme.colors.amethystGlow} />
          <Text style={styles.translatingText}>Re-translating messages...</Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.amethystGlow}
            colors={[theme.colors.amethystGlow]}
          />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <MaterialCommunityIcons
              name="message-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyMessagesText}>No messages yet</Text>
            <Text style={styles.emptyMessagesSubtext}>
              Start a conversation and messages will be translated automatically
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <TranslatedMessage
              key={message.id}
              message={message}
              isOwn={message.isOwn}
            />
          ))
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={`Type in ${targetLanguage}...`}
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isSending && !isTranslating}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.inputHint}>
          {inputText.length}/500
          {isTranslationNeeded(targetLanguage, conversationLanguage) &&
            ` • Will send in ${conversationLanguage}`}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  translatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  translatingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.amethystGlow,
    fontStyle: "italic",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: theme.spacing.md,
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
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  emptyMessages: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyMessagesText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyMessagesSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSize.base,
    color: "#C62828",
    textAlign: "center",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.amethystGlow,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  inputContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
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
  inputHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
