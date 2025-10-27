/**
 * Priority Tab
 * Shows urgent and high-priority messages from conversations
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useAuth } from "../../state/auth/useAuth";
import { useCasper } from "../useCasper";
import {
  firebaseFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  getDoc,
  doc,
} from "../../lib/firebase";
import {
  detectPriority,
  getPriorityBadge,
  getPriorityColor,
} from "../extract/priorityDetector";

const DONE_MESSAGES_KEY = "casper:priority:done";

interface PriorityMessage {
  cid: string;
  conversationName: string;
  conversationType: "dm" | "group";
  messageId: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  priorityLevel: "urgent" | "high";
  priorityScore: number;
  reasons: string[];
  isDone?: boolean;
}

export const PriorityTab: React.FC = () => {
  const { user } = useAuth();
  const { state, close } = useCasper();
  const conversationId = state.context?.cid;
  const isVisible = state.visible;

  const [messages, setMessages] = useState<PriorityMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [doneMessageIds, setDoneMessageIds] = useState<Set<string>>(new Set());
  const hasLoadedRef = useRef(false);
  const previousConversationIdRef = useRef<string | undefined>(undefined);

  // Load done messages from AsyncStorage
  useEffect(() => {
    const loadDoneMessages = async () => {
      try {
        const doneStr = await AsyncStorage.getItem(DONE_MESSAGES_KEY);
        if (doneStr) {
          setDoneMessageIds(new Set(JSON.parse(doneStr)));
        }
      } catch (error) {
        console.error("Error loading done messages:", error);
      }
    };
    loadDoneMessages();
  }, []);

  // Reset hasLoaded when Casper closes
  useEffect(() => {
    if (!isVisible) {
      hasLoadedRef.current = false;
    }
  }, [isVisible]);

  // Load priority messages when opening Casper or when conversation changes
  useEffect(() => {
    if (user?.uid && isVisible) {
      const conversationChanged =
        previousConversationIdRef.current !== conversationId;
      previousConversationIdRef.current = conversationId;

      if (!hasLoadedRef.current) {
        // First load
        hasLoadedRef.current = true;
        loadPriorityMessages();
      } else if (conversationChanged) {
        // Conversation changed - reload
        loadPriorityMessages();
      }
    }
  }, [user?.uid, conversationId, isVisible]);

  // Reload messages when doneMessageIds changes (to update done status)
  useEffect(() => {
    if (messages.length > 0) {
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          isDone: doneMessageIds.has(`${msg.cid}-${msg.messageId}`),
        }))
      );
    }
  }, [doneMessageIds]);

  const loadPriorityMessages = async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const priorityMessages = await getPriorityMessages(
        user.uid,
        conversationId || undefined,
        30 // Last 30 days (increased from 7)
      );

      // Mark messages as done based on our stored set
      const messagesWithDoneStatus = priorityMessages.map((msg) => ({
        ...msg,
        isDone: doneMessageIds.has(`${msg.cid}-${msg.messageId}`),
      }));

      setMessages(messagesWithDoneStatus);
    } catch (err) {
      console.error("Error loading priority messages:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load priority messages"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPriorityMessages();
    setRefreshing(false);
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  const toggleDone = async (cid: string, messageId: string) => {
    const key = `${cid}-${messageId}`;
    const newDoneSet = new Set(doneMessageIds);

    if (newDoneSet.has(key)) {
      newDoneSet.delete(key);
    } else {
      newDoneSet.add(key);
    }

    setDoneMessageIds(newDoneSet);

    // Update messages state
    setMessages((prev) =>
      prev.map((msg) =>
        msg.cid === cid && msg.messageId === messageId
          ? { ...msg, isDone: !msg.isDone }
          : msg
      )
    );

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(
        DONE_MESSAGES_KEY,
        JSON.stringify(Array.from(newDoneSet))
      );
    } catch (error) {
      console.error("Error saving done messages:", error);
    }
  };

  // Filter messages based on showHistory toggle
  const filteredMessages = showHistory
    ? messages.filter((msg) => msg.isDone) // History: only show done messages
    : messages.filter((msg) => !msg.isDone); // Active: only show pending messages

  // Render loading state
  if (loading && messages.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
        <Text style={styles.loadingText}>Loading priority messages...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={theme.colors.error}
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadPriorityMessages}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.amethystGlow}
          colors={[theme.colors.amethystGlow]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>
            {showHistory ? "Priority History" : "Priority Messages"}
          </Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <MaterialCommunityIcons
              name={showHistory ? "arrow-left" : "history"}
              size={20}
              color={theme.colors.amethystGlow}
            />
            <Text style={styles.historyButtonText}>
              {showHistory ? "Back" : "History"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {filteredMessages.length}{" "}
          {showHistory ? "completed" : "urgent or important"} message
          {filteredMessages.length !== 1 ? "s" : ""}
          {conversationId
            ? " in this conversation"
            : " across all conversations"}
        </Text>
        <Text style={styles.helpText}>Last 30 days • Pull down to refresh</Text>
      </View>

      {/* Empty State */}
      {filteredMessages.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name={showHistory ? "history" : "check-circle"}
            size={64}
            color={
              showHistory ? theme.colors.textSecondary : theme.colors.success
            }
          />
          <Text style={styles.emptyTitle}>
            {showHistory ? "No History Yet" : "No Urgent Messages!"}
          </Text>
          <Text style={styles.emptyText}>
            {showHistory
              ? "You haven't marked any priority messages as done yet."
              : messages.length > 0
              ? `All ${messages.length} priority messages marked as done! Check History to see them.`
              : "Messages with urgent keywords or patterns will appear here."}
          </Text>
          {!showHistory && (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>Detected patterns:</Text>
              <Text style={styles.exampleText}>
                • "URGENT", "ASAP", "CRITICAL"
              </Text>
              <Text style={styles.exampleText}>
                • Multiple exclamation marks (!!!)
              </Text>
              <Text style={styles.exampleText}>• "by EOD", "by tomorrow"</Text>
              <Text style={styles.exampleText}>• ALL CAPS MESSAGES</Text>
            </View>
          )}
        </View>
      ) : (
        /* Priority Messages List */
        filteredMessages.map((msg) => (
          <View
            key={`${msg.cid}-${msg.messageId}`}
            style={[
              styles.messageCard,
              msg.priorityLevel === "urgent" && styles.urgentCard,
              msg.isDone && styles.doneCard,
            ]}
          >
            {/* Priority Badge */}
            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor:
                    msg.priorityLevel === "urgent"
                      ? "rgba(255, 68, 68, 0.1)"
                      : "rgba(255, 165, 0, 0.1)",
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: getPriorityColor(msg.priorityLevel) },
                ]}
              >
                {getPriorityBadge(msg.priorityLevel)}
              </Text>
              <Text style={styles.scoreText}>Score: {msg.priorityScore}</Text>
            </View>

            {/* Conversation & Sender Info */}
            <View style={styles.metaRow}>
              <View style={styles.conversationInfo}>
                {msg.conversationType === "group" ? (
                  <>
                    <Text style={styles.conversationName} numberOfLines={1}>
                      {msg.conversationName}
                    </Text>
                    <Text style={styles.senderName}>{msg.senderName}</Text>
                  </>
                ) : (
                  <Text style={styles.conversationName} numberOfLines={1}>
                    {msg.senderName}
                  </Text>
                )}
              </View>
              <Text style={styles.timestamp}>
                {formatRelativeTime(msg.timestamp)}
              </Text>
            </View>

            {/* Message Text */}
            <Text style={styles.messageText}>{msg.text}</Text>

            {/* Reasons */}
            <View style={styles.reasonsContainer}>
              {msg.reasons.slice(0, 3).map((reason, i) => (
                <View key={i} style={styles.reasonTag}>
                  <Text style={styles.reasonText}>• {reason}</Text>
                </View>
              ))}
              {msg.reasons.length > 3 && (
                <Text style={styles.moreReasons}>
                  +{msg.reasons.length - 3} more
                </Text>
              )}
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                msg.isDone && styles.actionButtonDone,
              ]}
              onPress={() => toggleDone(msg.cid, msg.messageId)}
            >
              <MaterialCommunityIcons
                name={msg.isDone ? "check-circle" : "check-circle-outline"}
                size={20}
                color={
                  msg.isDone ? theme.colors.success : theme.colors.amethystGlow
                }
              />
              <Text
                style={[
                  styles.actionButtonText,
                  msg.isDone && styles.actionButtonTextDone,
                ]}
              >
                {msg.isDone ? "Mark as Pending" : "Mark as Done"}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
};

/**
 * Get priority messages from Firestore
 */
async function getPriorityMessages(
  uid: string,
  specificConversationId?: string,
  daysBack: number = 7
): Promise<PriorityMessage[]> {
  try {
    // Get user's conversations
    const conversationsRef = collection(firebaseFirestore, "conversations");
    const conversationsQuery = specificConversationId
      ? query(conversationsRef, where("__name__", "==", specificConversationId))
      : query(conversationsRef, where("members", "array-contains", uid));

    const conversations = await getDocs(conversationsQuery);
    const priorityMessages: PriorityMessage[] = [];

    // For each conversation, get recent messages
    for (const convDoc of conversations.docs) {
      const cid = convDoc.id;
      const convData = convDoc.data();
      const conversationType = convData.type || "dm";
      const members = convData.members || [];

      // Determine conversation name based on type
      let conversationName = "Unknown";
      if (conversationType === "group") {
        conversationName = convData.groupName || "Unnamed Conversation";
      } else {
        // DM: Get the other person's name
        const otherUserId = members.find((m: string) => m !== uid);
        if (otherUserId) {
          try {
            const otherUserDoc = await getDoc(
              doc(firebaseFirestore, "users", otherUserId)
            );
            if (otherUserDoc.exists()) {
              conversationName = otherUserDoc.data()?.displayName || "Unknown";
            }
          } catch (err) {
            console.error("Error fetching other user name:", err);
          }
        }
      }

      // Get messages from last X days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const messagesRef = collection(
        firebaseFirestore,
        `conversations/${cid}/messages`
      );
      const messagesQuery = query(
        messagesRef,
        where("timestamp", ">=", Timestamp.fromDate(cutoffDate)),
        orderBy("timestamp", "desc"),
        limit(100)
      );

      const messagesSnap = await getDocs(messagesQuery);

      // Check each message for priority
      for (const msgDoc of messagesSnap.docs) {
        const msgData = msgDoc.data();
        const text = msgData.text || "";

        // Skip own messages
        if (msgData.senderId === uid) continue;

        // Skip empty messages
        if (!text.trim()) continue;

        // Detect priority
        const priority = detectPriority(text);

        // Only include high or urgent
        if (priority.level === "urgent" || priority.level === "high") {
          // Get sender name
          let senderName = "Unknown";
          if (msgData.senderId) {
            try {
              const userDoc = await getDoc(
                doc(firebaseFirestore, "users", msgData.senderId)
              );
              if (userDoc.exists()) {
                senderName = userDoc.data()?.displayName || "Unknown";
              }
            } catch (err) {
              console.error("Error fetching sender name:", err);
            }
          }

          priorityMessages.push({
            cid,
            conversationName,
            conversationType: conversationType as "dm" | "group",
            messageId: msgDoc.id,
            text,
            senderId: msgData.senderId,
            senderName,
            timestamp: msgData.timestamp?.toMillis() || Date.now(),
            priorityLevel: priority.level as "urgent" | "high",
            priorityScore: priority.score,
            reasons: priority.reasons,
          });
        }
      }
    }

    // Sort by priority score (highest first), then by timestamp
    return priorityMessages.sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return b.timestamp - a.timestamp;
    });
  } catch (error) {
    console.error("Error fetching priority messages:", error);
    throw error;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.error,
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  filterToggleText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  historyButtonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  helpText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
    marginTop: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  exampleBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: "100%",
    marginTop: theme.spacing.md,
  },
  exampleTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  exampleText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginVertical: 2,
  },
  messageCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  urgentCard: {
    borderColor: "#FF4444",
    borderWidth: 2,
  },
  doneCard: {
    opacity: 0.6,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  priorityBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  scoreText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  conversationInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  conversationName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  senderName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  reasonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: theme.spacing.sm,
  },
  reasonTag: {
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  reasonText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  moreReasons: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.amethystGlow,
    marginLeft: theme.spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  actionButtonDone: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  actionButtonText: {
    color: theme.colors.amethystGlow,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  actionButtonTextDone: {
    color: theme.colors.success,
  },
});
