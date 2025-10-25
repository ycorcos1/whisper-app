/**
 * Digest Tab
 * Daily digest tab for the Casper AI agent
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useAuth } from "../../state/auth/useAuth";
import { useCasper } from "../useCasper";
import { generateDailyDigest, DailyDigest as DigestType } from "../summarize";

export const DigestTab: React.FC = () => {
  const { user } = useAuth();
  const { state } = useCasper();
  const conversationId = state.context?.cid;
  const isVisible = state.visible;

  const [digest, setDigest] = useState<DigestType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const previousConversationIdRef = useRef<string | undefined>(undefined);

  // Reset hasLoaded when Casper closes
  useEffect(() => {
    if (!isVisible) {
      hasLoadedRef.current = false;
    }
  }, [isVisible]);

  // Load digest when opening Casper or when conversation changes
  useEffect(() => {
    if (user?.uid && isVisible) {
      const conversationChanged =
        previousConversationIdRef.current !== conversationId;
      previousConversationIdRef.current = conversationId;

      if (!hasLoadedRef.current) {
        // First load - always force refresh to get latest data
        hasLoadedRef.current = true;
        loadDigest(true);
      } else if (conversationChanged) {
        // Conversation changed - reload with fresh data
        loadDigest(true);
      }
    }
  }, [user?.uid, conversationId, isVisible]);

  const loadDigest = async (forceRefresh: boolean = false) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generateDailyDigest(user.uid, forceRefresh);

      // Filter to only show the current conversation if we're in a chat
      if (conversationId) {
        const filteredToday = result.todayConversations.filter(
          (c) => c.cid === conversationId
        );
        const filteredYesterday = result.yesterdayConversations.filter(
          (c) => c.cid === conversationId
        );

        // Recalculate the content summary for this specific conversation
        let newContent = "";
        if (filteredToday.length === 0 && filteredYesterday.length === 0) {
          newContent = "No new messages today or yesterday.";
        } else {
          const parts: string[] = [];
          if (filteredToday.length > 0) {
            parts.push(
              `${filteredToday.length} message${
                filteredToday.length > 1 ? "s" : ""
              } today`
            );
          }
          if (filteredYesterday.length > 0) {
            parts.push(
              `${filteredYesterday.length} message${
                filteredYesterday.length > 1 ? "s" : ""
              } yesterday`
            );
          }
          newContent = parts.join(" • ");
        }

        setDigest({
          ...result,
          content: newContent,
          todayConversations: filteredToday,
          yesterdayConversations: filteredYesterday,
        });
      } else {
        setDigest(result);
      }
    } catch (err) {
      console.error("Error generating digest:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate digest"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDigest(true); // Force refresh
    setRefreshing(false);
  };

  const handleRegenerate = async () => {
    await loadDigest(true); // Force refresh
  };

  const handleCopyToClipboard = async () => {
    if (!digest) return;

    try {
      await Clipboard.setStringAsync(digest.content);
      Alert.alert("Copied!", "Digest copied to clipboard");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  // Helper to format timestamp
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {loading && !digest ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
          <Text style={styles.loadingText}>Generating digest...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color="#C62828"
          />
          <Text style={styles.errorTitle}>Error Loading Digest</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRegenerate}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !digest ? (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="newspaper-variant-outline"
            size={48}
            color={theme.colors.amethystGlow}
          />
          <Text style={styles.placeholderText}>No digest yet</Text>
          <Text style={styles.placeholderSubtext}>
            Pull down to refresh and generate your daily digest
          </Text>
        </View>
      ) : (
        <View style={styles.digestContainer}>
          {/* Header with Regenerate Button */}
          <View style={styles.digestHeaderRow}>
            <View style={styles.digestHeader}>
              <MaterialCommunityIcons
                name="newspaper-variant"
                size={24}
                color={theme.colors.amethystGlow}
              />
              <Text style={styles.digestTitle}>Daily Digest</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.regenerateButton,
                loading && styles.regenerateButtonDisabled,
              ]}
              onPress={handleRegenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.amethystGlow}
                />
              ) : (
                <MaterialCommunityIcons
                  name="refresh"
                  size={18}
                  color={theme.colors.amethystGlow}
                />
              )}
              <Text style={styles.regenerateButtonText}>
                {loading ? "Regenerating..." : "Regenerate"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.digestDate}>{formatDate(digest.createdAt)}</Text>

          {/* Content */}
          <View style={styles.digestSection}>
            <Text style={styles.digestContent}>{digest.content}</Text>
          </View>

          {/* Today's Conversations */}
          {digest.todayConversations &&
            digest.todayConversations.length > 0 && (
              <View style={styles.digestSection}>
                <Text style={styles.sectionTitle}>
                  Active Today ({digest.todayConversations.length})
                </Text>
                {digest.todayConversations.map((convo, idx) => (
                  <View
                    key={`${convo.cid}-${convo.messageId || idx}`}
                    style={styles.convoItem}
                  >
                    <MaterialCommunityIcons
                      name="message-text"
                      size={16}
                      color={theme.colors.amethystGlow}
                    />
                    <View style={styles.convoDetails}>
                      <View style={styles.convoHeader}>
                        <Text style={styles.convoName}>{convo.name}</Text>
                        <Text style={styles.convoTime}>
                          {new Date(convo.latestTimestamp).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>
                      <Text style={styles.convoMessage} numberOfLines={2}>
                        {convo.latestMessage}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

          {/* Yesterday's Conversations */}
          {digest.yesterdayConversations &&
            digest.yesterdayConversations.length > 0 && (
              <View style={styles.digestSection}>
                <Text style={styles.sectionTitle}>
                  Yesterday ({digest.yesterdayConversations.length})
                </Text>
                {digest.yesterdayConversations.map((convo, idx) => (
                  <View
                    key={`${convo.cid}-${convo.messageId || idx}`}
                    style={styles.convoItem}
                  >
                    <MaterialCommunityIcons
                      name="message-text-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <View style={styles.convoDetails}>
                      <View style={styles.convoHeader}>
                        <Text style={styles.convoName}>{convo.name}</Text>
                        <Text style={styles.convoTime}>
                          {new Date(convo.latestTimestamp).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </Text>
                      </View>
                      <Text style={styles.convoMessage} numberOfLines={2}>
                        {convo.latestMessage}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

          {/* Action Buttons */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleCopyToClipboard}
            >
              <MaterialCommunityIcons
                name="content-copy"
                size={20}
                color={theme.colors.amethystGlow}
              />
              <Text style={styles.iconButtonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#C62828",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
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
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
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
  digestContainer: {
    padding: theme.spacing.lg,
  },
  digestHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  digestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  regenerateButtonDisabled: {
    opacity: 0.5,
  },
  regenerateButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.amethystGlow,
  },
  digestTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  digestDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  digestSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  digestContent: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 22,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  taskText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  decisionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.xs,
  },
  decisionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  bottomActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  iconButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.amethystGlow,
  },
  convoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingLeft: theme.spacing.xs,
  },
  convoDetails: {
    flex: 1,
  },
  convoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  convoName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  convoTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  convoMessage: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
