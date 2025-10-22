/**
 * Messages Feature - Public API
 */

export {
  subscribeToMessages,
  sendMessage,
  sendImageMessage,
  updateMessageStatus,
  getMessage,
  markMessagesAsDelivered,
  markMessagesAsRead,
} from "./api";
export type { Message, MessageDoc } from "./api";
export * from "./persistence";
export * from "./useOptimisticMessages";
export * from "./queueProcessor";
