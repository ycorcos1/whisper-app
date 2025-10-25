/**
 * Notification Context
 * Manages in-app banner notifications for new messages
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { AppState } from "react-native";
import { subscribeToUserConversations } from "../features/conversations/api";
import { AuthContext } from "./auth/AuthContext";

export interface NotificationData {
  conversationId: string;
  conversationName: string;
  message: string;
  timestamp: Date;
}

interface NotificationContextValue {
  currentNotification: NotificationData | null;
  setCurrentConversationId: (id: string | null) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser } = useContext(AuthContext);
  const [currentNotification, setCurrentNotification] =
    useState<NotificationData | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  // Track last seen messages to detect new ones
  const lastSeenMessagesRef = useRef<{
    [conversationId: string]: {
      text: string;
      timestamp: Date;
      senderId: string;
    };
  }>({});

  // Track if this is the initial load to suppress notifications for existing messages
  const isInitialLoadRef = useRef(true);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Track app state to only show notifications when app is in foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      lastSeenMessagesRef.current = {};
      isInitialLoadRef.current = true;
      return;
    }

    // Subscribe to all user conversations to detect new messages
    const unsubscribe = subscribeToUserConversations(
      async (conversations) => {
        // On initial load, just track all conversations without notifying
        if (isInitialLoadRef.current) {
          for (const conv of conversations) {
            if (conv.lastMessageText) {
              const messageTimestamp =
                conv.lastMessageTimestamp || conv.updatedAt;
              lastSeenMessagesRef.current[conv.id] = {
                text: conv.lastMessageText,
                timestamp: messageTimestamp,
                senderId: "",
              };
            }
          }
          isInitialLoadRef.current = false;
          return; // Exit early on initial load
        }

        // For subsequent updates, process normally
        for (const conv of conversations) {
          // Skip if this is the currently active conversation
          if (conv.id === currentConversationId) {
            // Update our tracking even if we don't show notification
            if (conv.lastMessageText) {
              const messageTimestamp =
                conv.lastMessageTimestamp || conv.updatedAt;
              lastSeenMessagesRef.current[conv.id] = {
                text: conv.lastMessageText,
                timestamp: messageTimestamp,
                senderId: "", // We don't have this info in the list view
              };
            }
            continue;
          }

          // Check if there's a last message
          if (!conv.lastMessageText) continue;

          const lastSeen = lastSeenMessagesRef.current[conv.id];

          // Use lastMessageTimestamp if available, otherwise fall back to updatedAt
          // This prevents notifications for metadata changes (group name, etc.)
          const messageTimestamp = conv.lastMessageTimestamp || conv.updatedAt;

          const isNewMessage =
            !lastSeen ||
            messageTimestamp.getTime() > lastSeen.timestamp.getTime() ||
            conv.lastMessageText !== lastSeen.text;

          // Only show notification if it's a new message
          if (isNewMessage) {
            // Additional checks:
            // 1. App is in foreground
            // 2. User is authenticated
            // 3. Not in the conversation already
            const shouldNotify =
              appState.current === "active" &&
              firebaseUser &&
              conv.id !== currentConversationId;

            // Update tracking first
            lastSeenMessagesRef.current[conv.id] = {
              text: conv.lastMessageText,
              timestamp: messageTimestamp,
              senderId: "",
            };

            // Show notification if conditions are met
            if (shouldNotify) {
              // console.log(
              //   "Showing notification for:",
              //   conv.name,
              //   conv.lastMessageText
              // );
              setCurrentNotification({
                conversationId: conv.id,
                conversationName: conv.name,
                message: conv.lastMessageText,
                timestamp: conv.updatedAt,
              });

              // Auto-dismiss after showing (the Banner component handles the actual timing)
              // We'll clear this after the banner's auto-dismiss time
              setTimeout(() => {
                setCurrentNotification((current) => {
                  // Only clear if this is still the same notification
                  if (current?.conversationId === conv.id) {
                    return null;
                  }
                  return current;
                });
              }, 5500); // Slightly longer than banner auto-dismiss
            }
          } else {
            // Message already seen, just ensure tracking is up to date
            lastSeenMessagesRef.current[conv.id] = {
              text: conv.lastMessageText,
              timestamp: messageTimestamp,
              senderId: "",
            };
          }
        }
      },
      (error) => {
        console.error(
          "Error subscribing to conversations for notifications:",
          error
        );
      }
    );

    return () => {
      unsubscribe();
      // Reset initial load flag when user logs out or changes
      isInitialLoadRef.current = true;
    };
  }, [firebaseUser, currentConversationId]);

  const dismissNotification = () => {
    setCurrentNotification(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        currentNotification,
        setCurrentConversationId,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
}
