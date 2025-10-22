/**
 * Global Queue Processor
 * Processes outbound message queue on app startup and periodically
 * Ensures messages survive app restarts and are retried
 */

import { sendMessage } from "./api";
import {
  getQueue,
  removeFromQueue,
  updateQueueItem,
  shouldRetryMessage,
  QueuedMessage,
} from "./persistence";

let processingQueue = false;
let queueCheckInterval: NodeJS.Timeout | null = null;

/**
 * Process the global outbound queue
 * Attempts to send all queued messages that are ready for retry
 */
export async function processGlobalQueue(): Promise<void> {
  if (processingQueue) return;
  processingQueue = true;

  try {
    const queue = await getQueue();
    console.log(`[Queue Processor] Processing ${queue.length} queued messages`);

    for (const queuedMsg of queue) {
      // Only process messages that should be retried
      if (!shouldRetryMessage(queuedMsg)) {
        continue;
      }

      try {
        console.log(
          `[Queue Processor] Attempting to send message ${queuedMsg.tempId} (retry ${queuedMsg.retryCount})`
        );

        // Attempt to send the message
        if (queuedMsg.type === "text" && queuedMsg.text) {
          await sendMessage(
            queuedMsg.conversationId,
            queuedMsg.text,
            queuedMsg.tempId
          );

          // Success! Remove from queue
          await removeFromQueue(queuedMsg.tempId);
          console.log(
            `[Queue Processor] Successfully sent message ${queuedMsg.tempId}`
          );
        } else {
          // Invalid message type or missing data, remove from queue
          console.error(
            `[Queue Processor] Invalid message in queue: ${queuedMsg.tempId}`
          );
          await removeFromQueue(queuedMsg.tempId);
        }
      } catch (error) {
        console.error(
          `[Queue Processor] Error sending message ${queuedMsg.tempId}:`,
          error
        );

        // Update retry count
        const retryCount = queuedMsg.retryCount + 1;
        await updateQueueItem(queuedMsg.tempId, {
          retryCount,
          lastRetryAt: Date.now(),
        });

        if (retryCount >= 6) {
          console.error(
            `[Queue Processor] Message ${queuedMsg.tempId} failed after ${retryCount} retries`
          );
        }
      }
    }
  } catch (error) {
    console.error("[Queue Processor] Error processing queue:", error);
  } finally {
    processingQueue = false;
  }
}

/**
 * Start the global queue processor
 * Processes queue immediately and then every 30 seconds
 */
export function startGlobalQueueProcessor(): void {
  // Process queue immediately
  processGlobalQueue();

  // Set up periodic processing (every 30 seconds)
  if (!queueCheckInterval) {
    queueCheckInterval = setInterval(() => {
      processGlobalQueue();
    }, 30000); // 30 seconds
  }

  console.log("[Queue Processor] Started global queue processor");
}

/**
 * Stop the global queue processor
 */
export function stopGlobalQueueProcessor(): void {
  if (queueCheckInterval) {
    clearInterval(queueCheckInterval);
    queueCheckInterval = null;
  }

  console.log("[Queue Processor] Stopped global queue processor");
}

/**
 * Get queue status for debugging
 */
export async function getQueueStatus(): Promise<{
  totalMessages: number;
  readyToRetry: number;
  failedMessages: number;
}> {
  const queue = await getQueue();

  return {
    totalMessages: queue.length,
    readyToRetry: queue.filter((msg) => shouldRetryMessage(msg)).length,
    failedMessages: queue.filter((msg) => msg.retryCount >= 6).length,
  };
}
