/**
 * Optimistic UI Hook
 * Manages optimistic message updates and queue processing
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Message, sendMessage } from "./api";
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueueItem,
  shouldRetryMessage,
} from "./persistence";
import { firebaseAuth } from "../../lib/firebase";

export interface OptimisticMessage extends Message {
  isOptimistic: boolean;
  error?: string;
}

/**
 * Custom hook for managing optimistic messages
 */
export function useOptimisticMessages(
  conversationId: string,
  serverMessages: Message[]
) {
  const [optimisticMessages, setOptimisticMessages] = useState<
    Map<string, OptimisticMessage>
  >(new Map());
  const processingQueue = useRef(false);
  const queueCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Merge server messages with optimistic messages
  const allMessages = useCallback(() => {
    const merged = [...serverMessages];
    const optimisticArray = Array.from(optimisticMessages.values());

    // Add optimistic messages that haven't been confirmed yet
    optimisticArray.forEach((optMsg) => {
      const existsInServer = serverMessages.some(
        (msg) => msg.tempId === optMsg.tempId || msg.id === optMsg.id
      );
      if (!existsInServer) {
        merged.push(optMsg);
      }
    });

    // Sort by timestamp
    return merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [serverMessages, optimisticMessages]);

  /**
   * Add a new optimistic message
   */
  const addOptimisticMessage = useCallback(
    async (text: string): Promise<string> => {
      const tempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const currentUser = firebaseAuth.currentUser;

      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const optimisticMsg: OptimisticMessage = {
        id: tempId,
        tempId,
        senderId: currentUser.uid,
        type: "text",
        text,
        timestamp: new Date(),
        status: "sending",
        isOptimistic: true,
      };

      // Add to optimistic state
      setOptimisticMessages((prev) => new Map(prev).set(tempId, optimisticMsg));

      // Queue for sending
      await addToQueue({
        tempId,
        conversationId,
        type: "text",
        text,
        timestamp: Date.now(),
        retryCount: 0,
      });

      // Trigger queue processing
      processQueue();

      return tempId;
    },
    [conversationId]
  );

  /**
   * Remove an optimistic message (after server confirmation or error)
   */
  const removeOptimisticMessage = useCallback((tempId: string) => {
    setOptimisticMessages((prev) => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
  }, []);

  /**
   * Update an optimistic message status
   */
  const updateOptimisticMessage = useCallback(
    (tempId: string, updates: Partial<OptimisticMessage>) => {
      setOptimisticMessages((prev) => {
        const next = new Map(prev);
        const existing = next.get(tempId);
        if (existing) {
          next.set(tempId, { ...existing, ...updates });
        }
        return next;
      });
    },
    []
  );

  /**
   * Process the outbound queue
   */
  const processQueue = useCallback(async () => {
    if (processingQueue.current) return;
    processingQueue.current = true;

    try {
      const queue = await getQueue();
      const messagesToSend = queue.filter(
        (msg) =>
          msg.conversationId === conversationId && shouldRetryMessage(msg)
      );

      for (const queuedMsg of messagesToSend) {
        try {
          // Update optimistic message to show sending
          updateOptimisticMessage(queuedMsg.tempId, {
            status: "sending",
            error: undefined,
          });

          // Attempt to send
          await sendMessage(
            conversationId,
            queuedMsg.text || "",
            queuedMsg.tempId
          );

          // Success! Remove from queue and optimistic state
          await removeFromQueue(queuedMsg.tempId);

          // Don't remove immediately - let server message replace it
          setTimeout(() => {
            removeOptimisticMessage(queuedMsg.tempId);
          }, 1000);
        } catch (error) {
          console.error("Error sending message:", error);

          // Update retry count
          const retryCount = queuedMsg.retryCount + 1;
          await updateQueueItem(queuedMsg.tempId, {
            retryCount,
            lastRetryAt: Date.now(),
          });

          // Update optimistic message with error
          updateOptimisticMessage(queuedMsg.tempId, {
            status: "sending",
            error: retryCount >= 6 ? "Failed to send" : "Retrying...",
          });
        }
      }
    } finally {
      processingQueue.current = false;
    }
  }, [conversationId, removeOptimisticMessage, updateOptimisticMessage]);

  /**
   * Start queue processing on mount and set up periodic checks
   */
  useEffect(() => {
    // Process queue immediately
    processQueue();

    // Set up periodic queue processing (every 5 seconds)
    queueCheckInterval.current = setInterval(() => {
      processQueue();
    }, 5000);

    return () => {
      if (queueCheckInterval.current) {
        clearInterval(queueCheckInterval.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Clean up optimistic messages that have been confirmed by server
   */
  useEffect(() => {
    serverMessages.forEach((serverMsg) => {
      if (serverMsg.tempId) {
        // Server message has tempId, remove optimistic version
        removeOptimisticMessage(serverMsg.tempId);
      }
    });
  }, [serverMessages, removeOptimisticMessage]);

  return {
    messages: allMessages(),
    addOptimisticMessage,
    removeOptimisticMessage,
    updateOptimisticMessage,
    processQueue,
  };
}
