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
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import {
  getKeyboardBehavior,
  getChatKeyboardOffset,
} from "../lib/keyboardUtils";
import {
  RouteProp,
  useRoute,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getUserDisplayName,
  ConversationDoc,
  subscribeToConversation,
  markConversationAsRead,
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
  saveSelectedConversation,
  cacheMessages,
  getCachedMessages,
} from "../features/messages/persistence";
import { useOptimisticMessages } from "../features/messages/useOptimisticMessages";
import { useReadReceipts, updateLastReadMessage } from "../features/messages";
import { AuthContext } from "../state/auth/AuthContext";
import { useNotifications } from "../state/NotificationContext";
import { RootStackParamList } from "../navigation/types";
import { theme } from "../theme";
import { useTypingIndicator, useUserPresence } from "../features/presence";
import { TypingIndicator } from "../components/TypingIndicator";
import { MessageItem } from "../components/MessageItem";
import { FullImageModal } from "../components/FullImageModal";
import { Avatar } from "../components/Avatar";
import { pickImage, uploadImage } from "../lib/imageUtils";
import { sendImageMessage } from "../features/messages/api";
import {
  doc as firestoreDoc,
  getDoc,
  firebaseFirestore,
  onSnapshot,
} from "../lib/firebase";
import { useCasper } from "../agent/useCasper";

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const params = route.params as {
    conversationName: string;
    conversationId: string;
    fromNewChat?: boolean;
  };
  const { conversationName, conversationId, fromNewChat } = params;
  const { firebaseUser } = useContext(AuthContext);
  const { setCurrentConversationId } = useNotifications();
  const { open, setContext, close } = useCasper();

  const [messageText, setMessageText] = useState("");
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationDoc | null>(
    null
  );
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [senderNames, setSenderNames] = useState<{ [userId: string]: string }>(
    {}
  );
  const [displayTitle, setDisplayTitle] = useState<string>(conversationName);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserPhotoURL, setOtherUserPhotoURL] = useState<string | null>(
    null
  );
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImages, setSelectedImages] = useState<
    Array<{ uri: string; mimeType?: string }>
  >([]);
  const [messageSentCount, setMessageSentCount] = useState(0);
  const [messageLimit, setMessageLimit] = useState(15);
  const [hasMoreMessagesAvailable, setHasMoreMessagesAvailable] =
    useState(false);
  const [expandedReadReceipts, setExpandedReadReceipts] = useState<Set<string>>(
    new Set()
  );

  const flatListRef = useRef<FlatList>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senderNamesRef = useRef<{ [userId: string]: string }>({});

  // Use optimistic messages hook
  const { messages, addOptimisticMessage } = useOptimisticMessages(
    conversationId,
    serverMessages
  );

  // Use typing indicator hook
  const { typingUsers, handleTyping, stopTyping } =
    useTypingIndicator(conversationId);

  // Get other user's presence (for DM only)
  const { online: otherUserOnline } = useUserPresence(otherUserId);

  // Subscribe to read receipts (for group chats)
  const readReceipts = useReadReceipts(conversationId);

  // Update Casper context when conversation changes
  useEffect(() => {
    setContext({ cid: conversationId });

    // Cleanup: Close Casper when leaving this screen
    return () => {
      close();
    };
  }, [conversationId, setContext, close]);

  // Override back navigation if coming from NewChat
  useEffect(() => {
    if (!fromNewChat) return;

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      // Only intercept if it's a user-initiated back action (POP)
      if (e.data.action.type !== "POP") {
        return;
      }

      // If user has sent at least one message, go to Home (Conversations)
      if (messageSentCount > 0) {
        // Prevent default back action
        e.preventDefault();

        // Remove the listener to avoid infinite loop
        unsubscribe();

        // Navigate to Home (Conversations screen)
        navigation.navigate("Home", { screen: "Conversations" });
      }
      // If messageSentCount === 0, let the default back behavior happen (go to NewChat)
    });

    return unsubscribe;
  }, [navigation, fromNewChat, messageSentCount]);

  // Set current conversation for notification filtering and mark as read
  useEffect(() => {
    // Set this conversation as active
    setCurrentConversationId(conversationId);

    // Mark conversation as read
    markConversationAsRead(conversationId).catch((error) => {
      console.error("Error marking conversation as read:", error);
    });

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

          // Update ref for use in message subscription
          senderNamesRef.current = names;
          setSenderNames(names);
          // Use groupName if it exists, otherwise show member names
          if (conv.groupName) {
            setDisplayTitle(conv.groupName);
          } else {
            setDisplayTitle(otherMemberNames.join(", "));
          }

          // If we have cached messages and loading is still true, show them now
          if (loading && serverMessages.length > 0) {
            setLoading(false);
          }
        } else if (conv.type === "dm") {
          // For DM, get the other user's name, ID, and photo
          const otherMemberId = conv.members.find(
            (m) => m !== firebaseUser?.uid
          );
          if (otherMemberId) {
            // Fetch user document for name and photo
            const userDocRef = firestoreDoc(
              firebaseFirestore,
              "users",
              otherMemberId
            );
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as {
                displayName?: string;
                email?: string;
                photoURL?: string | null;
              };
              const displayName =
                userData.displayName || userData.email || otherMemberId;
              setDisplayTitle(displayName);
              setOtherUserPhotoURL(userData.photoURL || null);
            } else {
              const displayName = await getUserDisplayName(otherMemberId);
              setDisplayTitle(displayName);
              setOtherUserPhotoURL(null);
            }
            setOtherUserId(otherMemberId); // Store for presence tracking
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
  }, [conversationId, firebaseUser?.uid, loading, serverMessages.length]);

  // Subscribe to real-time user document updates for display names
  useEffect(() => {
    if (!conversation) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to each member's user document
    for (const memberId of conversation.members) {
      const userDocRef = firestoreDoc(firebaseFirestore, "users", memberId);

      const unsubscribe = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as {
              displayName?: string;
              email?: string;
              photoURL?: string | null;
            };
            const displayName =
              userData.displayName || userData.email || memberId;

            // Only update if name actually changed
            const currentName = senderNamesRef.current[memberId];
            if (currentName !== displayName) {
              // Update sender names
              setSenderNames((prev) => ({
                ...prev,
                [memberId]: displayName,
              }));
              senderNamesRef.current[memberId] = displayName;

              // For DM, update title and photo if it's the other user
              if (
                conversation.type === "dm" &&
                memberId !== firebaseUser?.uid
              ) {
                setDisplayTitle(displayName);
                if (userData.photoURL !== otherUserPhotoURL) {
                  setOtherUserPhotoURL(userData.photoURL || null);
                }
              }

              // For group chat without groupName, update title
              if (conversation.type === "group" && !conversation.groupName) {
                const otherMemberNames = conversation.members
                  .filter((id) => id !== firebaseUser?.uid)
                  .map((id) => senderNamesRef.current[id] || "Unknown");
                setDisplayTitle(otherMemberNames.join(", "));
              }
            }
          }
        },
        (error) => {
          console.error(`Error listening to user ${memberId}:`, error);
        }
      );

      unsubscribers.push(unsubscribe);
    }

    // Cleanup all listeners
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [conversation, firebaseUser?.uid]);

  // Load cached messages and draft on mount
  useEffect(() => {
    const loadCachedData = async () => {
      // Try to load cached messages first
      const cached = await getCachedMessages(conversationId);
      if (cached) {
        // Convert cached messages back to Message format
        const cachedMessages: Message[] = cached.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp), // Convert number back to Date
        }));
        setServerMessages(cachedMessages);
        // For group chats, wait for conversation to load (to get member names)
        // For DMs, show cached messages immediately
        if (conversation?.type !== "group") {
          setLoading(false);
        }
        // Group chats will set loading=false after conversation loads
      }

      // Load draft
      const draft = await getDraft(conversationId);
      if (draft) {
        setMessageText(draft);
      }

      // Save selected conversation
      saveSelectedConversation(conversationId);
    };
    loadCachedData();
  }, [conversationId, conversation?.type]);

  // Subscribe to messages (wait for conversation to load first for group chats)
  useEffect(() => {
    // Wait for conversation to be loaded before subscribing to messages
    if (!conversationLoaded) {
      return; // Don't subscribe to messages yet
    }

    // Show background loading only if we have cached messages
    if (serverMessages.length === 0) {
      setLoading(true); // Full screen loading if no cache
    } else {
      setBackgroundLoading(true); // Subtle indicator if cache exists
    }

    const unsubscribe = subscribeToMessages(
      conversationId,
      (msgs) => {
        // Enrich messages with sender names for group chats
        const enrichedMsgs = msgs.map((msg) => ({
          ...msg,
          senderName:
            conversation?.type === "group"
              ? senderNamesRef.current[msg.senderId]
              : undefined,
        }));
        setServerMessages(enrichedMsgs);
        // Check if there are more messages available by comparing loaded count with requested limit
        setHasMoreMessagesAvailable(enrichedMsgs.length >= messageLimit);
        setLoading(false);
        setBackgroundLoading(false);

        // Cache messages for next time
        cacheMessages(conversationId, enrichedMsgs).catch((error) => {
          console.error("Error caching messages:", error);
        });

        // Mark messages as delivered when received
        markMessagesAsDelivered(conversationId).catch((error) => {
          console.error("Error marking messages as delivered:", error);
        });
      },
      (error) => {
        console.error("Error loading messages:", error);
        setLoading(false);
        setBackgroundLoading(false);
      },
      messageLimit // Use dynamic message limit
    );

    return unsubscribe;
  }, [
    conversationId,
    conversationLoaded,
    conversation?.type,
    firebaseUser?.uid,
    serverMessages.length,
    messageLimit,
  ]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Get the last message ID once to avoid re-running on every message change
      const lastMessageId = messages[messages.length - 1]?.id;
      if (!lastMessageId) return;

      // Mark as read after a short delay to simulate viewing
      const readTimer = setTimeout(() => {
        markMessagesAsRead(conversationId).catch((error) => {
          console.error("Error marking messages as read:", error);
        });
        // Also update the conversation's lastReadAt timestamp
        markConversationAsRead(conversationId).catch((error) => {
          console.error("Error marking conversation as read:", error);
        });

        // Update lastReadMid for group chats read receipts
        if (conversation?.type === "group" && lastMessageId) {
          updateLastReadMessage(conversationId, lastMessageId).catch(
            (error) => {
              console.error("Error updating last read message:", error);
            }
          );
        }
      }, 200); // Reduced delay for faster response

      return () => clearTimeout(readTimer);
    }
    return undefined;
  }, [
    conversationId,
    loading,
    messages[messages.length - 1]?.id,
    conversation?.type,
  ]);

  // Force scroll to bottom when screen comes into focus (navigation back to chat)
  useFocusEffect(
    React.useCallback(() => {
      // Mark conversation as read immediately when screen comes into focus
      if (!loading && messages.length > 0) {
        markConversationAsRead(conversationId).catch((error) => {
          console.error("Error marking conversation as read:", error);
        });
      }

      return undefined;
    }, [conversationId, loading, messages.length])
  );

  // Note: With inverted={true}, no scroll effects needed - messages render at bottom naturally

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

  // Determine status label for DM conversations
  const getStatusLabel = (): string | null => {
    // Only show status for DM conversations
    if (conversation?.type !== "dm" || !otherUserId) {
      return null;
    }

    // Typing overrides online/offline status
    const isOtherUserTyping = typingUsers.some(
      (user) => user.userId === otherUserId
    );

    if (isOtherUserTyping) {
      return "typing...";
    }

    return otherUserOnline ? "Online" : "Offline";
  };

  // Add header with custom title and status label
  useLayoutEffect(() => {
    const statusLabel = getStatusLabel();

    navigation.setOptions?.({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Background loading spinner */}
          {backgroundLoading && (
            <ActivityIndicator size="small" color={theme.colors.amethystGlow} />
          )}
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
        </View>
      ),
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          {conversation?.type === "dm" && otherUserId && (
            <Avatar
              photoURL={otherUserPhotoURL}
              displayName={displayTitle}
              userId={otherUserId}
              size="small"
              style={styles.headerAvatar}
            />
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {displayTitle}
            </Text>
            {statusLabel && (
              <Text style={styles.statusLabel} numberOfLines={1}>
                {statusLabel}
              </Text>
            )}
          </View>
        </View>
      ),
    });
  }, [
    navigation,
    conversationId,
    displayTitle,
    conversation?.type,
    otherUserId,
    otherUserPhotoURL,
    otherUserOnline,
    typingUsers,
    backgroundLoading,
  ]);

  const handleSend = async () => {
    const textToSend = messageText.trim();
    const hasText = textToSend.length > 0;
    const hasImages = selectedImages.length > 0;

    if (!hasText && !hasImages) return;

    try {
      // Clear input and images immediately for better UX
      setMessageText("");
      clearDraft(conversationId);
      const imagesToSend = [...selectedImages];
      setSelectedImages([]);

      // Stop typing indicator
      stopTyping();

      // Send text message if there's text
      if (hasText) {
        await addOptimisticMessage(textToSend);
        // Increment message sent count
        setMessageSentCount((prev) => prev + 1);
      }

      // Send image messages if there are images
      if (hasImages) {
        setUploadingImage(true);
        setUploadProgress(0);

        for (let i = 0; i < imagesToSend.length; i++) {
          const image = imagesToSend[i];
          const tempMessageId = `temp_${Date.now()}_${i}`;

          // Upload image to Firebase Storage
          const imageUrl = await uploadImage(
            conversationId,
            tempMessageId,
            image.uri,
            image.mimeType || "image/jpeg",
            (progress) => {
              // Calculate overall progress based on which image we're on
              const overallProgress =
                ((i + progress.progress / 100) / imagesToSend.length) * 100;
              setUploadProgress(overallProgress);
            }
          );

          // Send image message
          await sendImageMessage(
            conversationId,
            imageUrl,
            undefined,
            tempMessageId
          );
          // Increment message sent count for each image
          setMessageSentCount((prev) => prev + 1);
        }

        setUploadingImage(false);
        setUploadProgress(0);
      }

      // Note: With inverted={true}, new messages appear at bottom automatically
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert(
        "Error",
        "Failed to send message. It will be retried automatically."
      );
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handlePickImage = async () => {
    // Check if we've reached the max limit
    if (selectedImages.length >= 5) {
      Alert.alert(
        "Maximum Images",
        "You can only select up to 5 images at a time."
      );
      return;
    }

    try {
      const result = await pickImage();
      if (!result) return; // User cancelled

      // Add image to selected images array
      setSelectedImages((prev) => [
        ...prev,
        { uri: result.uri, mimeType: result.mimeType },
      ]);
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to pick image. Please try again."
      );
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  };

  const loadMoreMessages = () => {
    setMessageLimit((prev) => prev + 10);
  };

  const handleReadReceiptExpand = (messageId: string) => {
    setExpandedReadReceipts((prev) => new Set(prev).add(messageId));
  };

  const handleReadReceiptCollapse = (messageId: string) => {
    setExpandedReadReceipts((prev) => {
      const newSet = new Set(prev);
      newSet.delete(messageId);
      return newSet;
    });
  };

  const collapseAllReadReceipts = () => {
    setExpandedReadReceipts(new Set());
  };

  // Note: Removed getItemLayout because messages have variable heights
  // (text messages, images, read receipts) making fixed height calculations inaccurate

  const renderListHeader = () => {
    // With inverted FlatList, this appears at the bottom
    // No spacing needed - messages sit naturally above composer
    return null;
  };

  const renderListFooter = () => {
    // With inverted FlatList, this appears at the top
    // Show load more button at the top where older messages are
    if (!hasMoreMessagesAvailable) return null;

    return (
      <TouchableOpacity
        style={styles.loadMoreCTA}
        onPress={loadMoreMessages}
        activeOpacity={0.7}
      >
        <Text style={styles.loadMoreText}>Load older messages...</Text>
      </TouchableOpacity>
    );
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

    // Calculate read receipts for this message (group chats only)
    const seenByNames: string[] = [];
    if (isGroupChat && conversation) {
      // Get users who have read this message and are still members of the conversation
      const usersWhoRead = readReceipts.filter(
        (receipt) =>
          receipt.lastReadMid === item.id &&
          receipt.userId !== firebaseUser?.uid &&
          conversation.members.includes(receipt.userId) // Only include current members
      );

      // Map to display names
      for (const receipt of usersWhoRead) {
        const displayName = senderNames[receipt.userId];
        if (displayName) {
          seenByNames.push(displayName);
        }
      }
    }

    return (
      <MessageItem
        message={item}
        isOwn={isOwn}
        isOptimistic={isOptimistic}
        error={error}
        showSender={isGroupChat && !isOwn} // Show sender name for group messages
        onImagePress={handleImagePress}
        seenByNames={isGroupChat ? seenByNames : undefined}
        onReadReceiptExpand={handleReadReceiptExpand}
        onReadReceiptCollapse={handleReadReceiptCollapse}
        isReadReceiptExpanded={expandedReadReceipts.has(item.id)}
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
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getChatKeyboardOffset()}
    >
      <View style={{ flex: 1 }}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start the conversation with {conversationName}
            </Text>
          </View>
        ) : (
          <FlatList
            key={conversationId} // Force re-render when conversation changes
            ref={flatListRef}
            data={[...messages].reverse()} // Reverse array so newest messages appear at bottom
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onScroll={collapseAllReadReceipts}
            scrollEventThrottle={16}
            inverted={true} // Render from bottom up - newest messages at bottom immediately
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            ListHeaderComponent={renderListHeader} // No spacing at bottom
            ListFooterComponent={renderListFooter} // Load older messages at top
            onScrollToTop={() => {
              // Handle status bar tap - scroll to oldest messages (top of inverted list)
              flatListRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
              });
            }}
          />
        )}

        {/* Typing indicator - only show for DM conversations */}
        {conversation?.type === "dm" && typingUsers.length > 0 && (
          <TypingIndicator isTyping={true} userName={displayTitle} />
        )}
      </View>

      {/* Upload progress indicator */}
      {uploadingImage && (
        <View style={styles.uploadProgressContainer}>
          <View style={styles.uploadProgressBar}>
            <View
              style={[
                styles.uploadProgressFill,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
          <Text style={styles.uploadProgressText}>
            Uploading images... {Math.round(uploadProgress)}%
          </Text>
        </View>
      )}

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <View style={styles.selectedImagesContainer}>
          <FlatList
            data={selectedImages}
            horizontal
            keyExtractor={(_item, index) => `selected-${index}`}
            renderItem={({ item, index }) => (
              <View style={styles.selectedImageWrapper}>
                <Image
                  source={{ uri: item.uri }}
                  style={styles.selectedImage}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={24}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />
          <Text style={styles.imageCountText}>
            {selectedImages.length}/5 images
          </Text>
        </View>
      )}

      <View style={styles.composer}>
        <TouchableOpacity
          style={styles.ghostButton}
          onPress={() => open({ source: "chat", cid: conversationId })}
          disabled={uploadingImage}
        >
          <MaterialCommunityIcons name="ghost" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={handlePickImage}
          disabled={uploadingImage}
        >
          <Text style={styles.imageButtonText}>+</Text>
        </TouchableOpacity>
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
          editable={!uploadingImage}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            ((!messageText.trim() && selectedImages.length === 0) ||
              uploadingImage) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={
            (!messageText.trim() && selectedImages.length === 0) ||
            uploadingImage
          }
        >
          <MaterialCommunityIcons name="arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Full image modal */}
      <FullImageModal
        visible={selectedImageUrl !== null}
        imageUrl={selectedImageUrl || ""}
        onClose={() => setSelectedImageUrl(null)}
      />
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
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 250, // Increased to accommodate avatar + text
  },
  headerAvatar: {
    marginRight: theme.spacing.sm,
  },
  headerTextContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 0, // Changed from 1 to prevent text overflow
    maxWidth: 180, // Constrain text width
  },
  headerTitleText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: "center",
  },
  statusLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
    textAlign: "center",
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
    paddingTop: theme.spacing.md,
    paddingBottom: 0, // Remove bottom padding so messages can be right above composer
  },
  composer: {
    flexDirection: "row",
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "flex-end",
    gap: theme.spacing.sm,
  },
  ghostButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Fully circular
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Fully circular
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonText: {
    fontSize: 28,
    fontWeight: "600",
    color: theme.colors.amethystGlow,
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
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20, // Fully circular
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  uploadProgressContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  uploadProgressBar: {
    height: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: theme.spacing.xs,
  },
  uploadProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.amethystGlow,
  },
  uploadProgressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  selectedImagesContainer: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  selectedImageWrapper: {
    position: "relative",
    marginRight: theme.spacing.sm,
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: "center",
  },
  loadMoreCTA: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  loadMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
