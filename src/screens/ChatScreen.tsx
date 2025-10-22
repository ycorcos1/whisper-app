/**
 * Chat Screen
 * Individual conversation with message list and composer
 */

import React, {
  useLayoutEffect,
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import {
  getUserDisplayName,
  ConversationDoc,
  subscribeToConversation,
} from "../features/conversations/api";
import {
  subscribeToMessages,
  Message,
  markMessagesAsDelivered,
  markMessagesAsRead,
} from "../features/messages/api";
import {
  saveDraft,
  getDraft,
  clearDraft,
  saveScrollPosition,
  getScrollPosition,
  saveSelectedConversation,
} from "../features/messages/persistence";
import { useOptimisticMessages } from "../features/messages/useOptimisticMessages";
import { AuthContext } from "../state/auth/AuthContext";
import { useNotifications } from "../state/NotificationContext";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { useTypingIndicator } from "../features/presence";
import { TypingIndicator } from "../components/TypingIndicator";
import { MessageItem } from "../components/MessageItem";

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const params = route.params as {
    conversationName: string;
    conversationId: string;
  };
  const { conversationName, conversationId } = params;
  const { firebaseUser } = useContext(AuthContext);
  const { setCurrentConversationId } = useNotifications();

  const [messageText, setMessageText] = useState("");
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [conversation, setConversation] = useState<ConversationDoc | null>(
    null
  );
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [senderNames, setSenderNames] = useState<{ [userId: string]: string }>(
    {}
  );
  const [displayTitle, setDisplayTitle] = useState<string>(conversationName);

  const flatListRef = useRef<FlatList>(null);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use optimistic messages hook
  const { messages, addOptimisticMessage } = useOptimisticMessages(
    conversationId,
    serverMessages
  );

  // Use typing indicator hook
  const { typingUsers, handleTyping, stopTyping } =
    useTypingIndicator(conversationId);

  // Set current conversation for notification filtering
  useEffect(() => {
    // Set this conversation as active
    setCurrentConversationId(conversationId);

    // Clear when leaving
    return () => {
      setCurrentConversationId(null);
    };
  }, [conversationId, setCurrentConversationId]);

  // Subscribe to conversation updates for real-time group name changes
  useEffect(() => {
    const unsubscribe = subscribeToConversation(
      conversationId,
      async (conv) => {
        if (!conv) return;

        setConversation(conv);

        // If it's a group chat, load all member names (including current user) and update title
        if (conv.type === "group") {
          const names: { [userId: string]: string } = {};
          const otherMemberNames: string[] = [];

          for (const memberId of conv.members) {
            const displayName = await getUserDisplayName(memberId);
            names[memberId] = displayName;

            // Collect other members' names for title
            if (memberId !== firebaseUser?.uid) {
              otherMemberNames.push(displayName);
            }
          }

          setSenderNames(names);
          // Use groupName if it exists, otherwise show member names
          if (conv.groupName) {
            setDisplayTitle(conv.groupName);
          } else {
            setDisplayTitle(otherMemberNames.join(", "));
          }
        } else if (conv.type === "dm") {
          // For DM, get the other user's name
          const otherMemberId = conv.members.find(
            (m) => m !== firebaseUser?.uid
          );
          if (otherMemberId) {
            const displayName = await getUserDisplayName(otherMemberId);
            setDisplayTitle(displayName);
          }
        }

        // Mark conversation as loaded
        setConversationLoaded(true);
      },
      (error) => {
        console.error("Error subscribing to conversation:", error);
      }
    );

    return unsubscribe;
  }, [conversationId, firebaseUser?.uid]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await getDraft(conversationId);
      if (draft) {
        setMessageText(draft);
      }
    };
    loadDraft();

    // Save selected conversation
    saveSelectedConversation(conversationId);
  }, [conversationId]);

  // Subscribe to messages (wait for conversation to load first for group chats)
  useEffect(() => {
    // Wait for conversation to be loaded before subscribing to messages
    if (!conversationLoaded) {
      return; // Don't subscribe to messages yet
    }

    setLoading(true);
    const unsubscribe = subscribeToMessages(
      conversationId,
      (msgs) => {
        // Enrich messages with sender names for group chats
        const enrichedMsgs = msgs.map((msg) => ({
          ...msg,
          senderName:
            conversation?.type === "group"
              ? senderNames[msg.senderId]
              : undefined,
        }));
        setServerMessages(enrichedMsgs);
        setLoading(false);

        // Mark messages as delivered when received
        markMessagesAsDelivered(conversationId).catch((error) => {
          console.error("Error marking messages as delivered:", error);
        });
      },
      (error) => {
        console.error("Error loading messages:", error);
        setLoading(false);
      },
      30 // Load 30 most recent messages
    );

    return unsubscribe;
  }, [
    conversationId,
    conversationLoaded,
    conversation?.type,
    senderNames,
    firebaseUser?.uid,
  ]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Mark as read after a short delay to simulate viewing
      const readTimer = setTimeout(() => {
        markMessagesAsRead(conversationId).catch((error) => {
          console.error("Error marking messages as read:", error);
        });
      }, 1000); // 1 second delay

      return () => clearTimeout(readTimer);
    }
    return undefined;
  }, [conversationId, loading, messages.length]);

  // Restore scroll position
  useEffect(() => {
    if (!loading && messages.length > 0 && !initialScrollDone) {
      const restoreScroll = async () => {
        const savedPosition = await getScrollPosition(conversationId);
        if (savedPosition !== null && flatListRef.current) {
          // Scroll to saved position after a short delay to ensure list is rendered
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: savedPosition,
              animated: false,
            });
          }, 100);
        }
        setInitialScrollDone(true);
      };
      restoreScroll();
    }
  }, [loading, messages, conversationId, initialScrollDone]);

  // Save draft when text changes (debounced)
  useEffect(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }

    draftTimerRef.current = setTimeout(() => {
      if (messageText.trim()) {
        saveDraft(conversationId, messageText);
      } else {
        clearDraft(conversationId);
      }
    }, 500); // 500ms debounce

    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [messageText, conversationId]);

  // Add header info icon and update title
  useLayoutEffect(() => {
    navigation.setOptions?.({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.navigate("ChatSettings", { conversationId });
          }}
          style={styles.headerButton}
        >
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
        </TouchableOpacity>
      ),
      headerTitle: displayTitle,
    });
  }, [navigation, conversationId, displayTitle]);

  const handleSend = async () => {
    const textToSend = messageText.trim();
    if (textToSend) {
      // Clear input immediately for better UX
      setMessageText("");
      clearDraft(conversationId);

      // Stop typing indicator
      stopTyping();

      try {
        // Add optimistic message
        await addOptimisticMessage(textToSend);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error("Error sending message:", error);
        Alert.alert(
          "Error",
          "Failed to send message. It will be retried automatically."
        );
      }
    }
  };

  const handleScroll = (event: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    saveScrollPosition(conversationId, offsetY);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === firebaseUser?.uid;
    const optimisticMsg = item as Message & {
      isOptimistic?: boolean;
      error?: string;
    };
    const isOptimistic = optimisticMsg.isOptimistic ?? false;
    const error = optimisticMsg.error ?? undefined;
    const isGroupChat = conversation?.type === "group";

    return (
      <MessageItem
        message={item}
        isOwn={isOwn}
        isOptimistic={isOptimistic}
        error={error}
        showSender={isGroupChat && !isOwn} // Show sender name for group messages
      />
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Start the conversation with {conversationName}
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onScroll={handleScroll}
            scrollEventThrottle={400}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />
          {/* Typing indicator */}
          <TypingIndicator
            isTyping={typingUsers.length > 0}
            userName={typingUsers.length === 1 ? conversationName : undefined}
          />
        </>
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Whisper something..."
          placeholderTextColor={theme.colors.textSecondary}
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            // Trigger typing indicator
            if (text.trim()) {
              handleTyping();
            } else {
              stopTyping();
            }
          }}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  headerButton: {
    paddingHorizontal: 12,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  infoIconText: {
    color: theme.colors.amethystGlow,
    fontSize: 16,
    fontWeight: "600",
    fontStyle: "italic",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  messagesList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  composer: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
