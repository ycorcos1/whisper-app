/**
 * Message Persistence
 * Handles drafts, scroll position, outbound queue, and schema migrations
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Schema version for migrations
export const APP_STATE_SCHEMA_VERSION = 1;

// Storage keys
const KEYS = {
  SCHEMA_VERSION: "@whisper:schema_version",
  DRAFTS: "@whisper:drafts",
  OUTBOUND_QUEUE: "@whisper:outbound_queue",
  SELECTED_CONVERSATION: "@whisper:selected_conversation",
  THEME_PREFS: "@whisper:theme_prefs",
  MESSAGE_CACHE: "@whisper:message_cache",
  DISPLAY_NAME_CACHE: "@whisper:display_name_cache",
};

export interface QueuedMessage {
  tempId: string;
  conversationId: string;
  type: "text" | "image";
  text?: string;
  imageUrl?: string;
  timestamp: number;
  retryCount: number;
  lastRetryAt?: number;
}

export interface ThemePreferences {
  darkMode?: boolean;
  accentColor?: string;
}

export interface CachedMessage {
  id: string;
  senderId: string;
  senderName?: string;
  type: "text" | "image";
  text?: string;
  image?: {
    url: string;
    thumbnailUrl?: string;
  };
  timestamp: number; // Stored as number for JSON serialization
  status: "sending" | "sent" | "delivered" | "read";
  tempId?: string;
}

export interface MessageCache {
  [conversationId: string]: {
    messages: CachedMessage[];
    cachedAt: number;
  };
}

/**
 * Check and run migrations if needed
 */
export async function runMigrations(): Promise<void> {
  try {
    const currentVersion = await AsyncStorage.getItem(KEYS.SCHEMA_VERSION);
    const version = currentVersion ? parseInt(currentVersion, 10) : 0;

    if (version < APP_STATE_SCHEMA_VERSION) {
      // console.log(
      //   `Running migrations from version ${version} to ${APP_STATE_SCHEMA_VERSION}`
      // );

      // Migration logic for future versions
      if (version < 1) {
        // Version 1: Initial schema, no migration needed
        // console.log("Initializing schema v1");
      }

      // Save new schema version
      await AsyncStorage.setItem(
        KEYS.SCHEMA_VERSION,
        APP_STATE_SCHEMA_VERSION.toString()
      );
      // console.log(
      //   `Migrations complete. Schema version: ${APP_STATE_SCHEMA_VERSION}`
      // );
    }
  } catch (error) {
    console.error("Error running migrations:", error);
  }
}

/**
 * Draft Management
 */

export async function saveDraft(
  conversationId: string,
  text: string
): Promise<void> {
  try {
    const draftsJson = await AsyncStorage.getItem(KEYS.DRAFTS);
    const drafts = draftsJson ? JSON.parse(draftsJson) : {};
    drafts[conversationId] = text;
    await AsyncStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch (error) {
    console.error("Error saving draft:", error);
  }
}

export async function getDraft(conversationId: string): Promise<string | null> {
  try {
    const draftsJson = await AsyncStorage.getItem(KEYS.DRAFTS);
    if (!draftsJson) return null;
    const drafts = JSON.parse(draftsJson);
    return drafts[conversationId] || null;
  } catch (error) {
    console.error("Error getting draft:", error);
    return null;
  }
}

export async function clearDraft(conversationId: string): Promise<void> {
  try {
    const draftsJson = await AsyncStorage.getItem(KEYS.DRAFTS);
    if (!draftsJson) return;
    const drafts = JSON.parse(draftsJson);
    delete drafts[conversationId];
    await AsyncStorage.setItem(KEYS.DRAFTS, JSON.stringify(drafts));
  } catch (error) {
    console.error("Error clearing draft:", error);
  }
}

/**
 * Outbound Queue Management (for offline support)
 */

export async function addToQueue(message: QueuedMessage): Promise<void> {
  try {
    const queueJson = await AsyncStorage.getItem(KEYS.OUTBOUND_QUEUE);
    const queue: QueuedMessage[] = queueJson ? JSON.parse(queueJson) : [];
    queue.push(message);
    await AsyncStorage.setItem(KEYS.OUTBOUND_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error("Error adding to queue:", error);
  }
}

export async function getQueue(): Promise<QueuedMessage[]> {
  try {
    const queueJson = await AsyncStorage.getItem(KEYS.OUTBOUND_QUEUE);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error("Error getting queue:", error);
    return [];
  }
}

export async function removeFromQueue(tempId: string): Promise<void> {
  try {
    const queue = await getQueue();
    const filtered = queue.filter((msg) => msg.tempId !== tempId);
    await AsyncStorage.setItem(KEYS.OUTBOUND_QUEUE, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing from queue:", error);
  }
}

export async function updateQueueItem(
  tempId: string,
  updates: Partial<QueuedMessage>
): Promise<void> {
  try {
    const queue = await getQueue();
    const index = queue.findIndex((msg) => msg.tempId === tempId);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(KEYS.OUTBOUND_QUEUE, JSON.stringify(queue));
    }
  } catch (error) {
    console.error("Error updating queue item:", error);
  }
}

/**
 * Selected Conversation Management
 */

export async function saveSelectedConversation(
  conversationId: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SELECTED_CONVERSATION, conversationId);
  } catch (error) {
    console.error("Error saving selected conversation:", error);
  }
}

export async function getSelectedConversation(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.SELECTED_CONVERSATION);
  } catch (error) {
    console.error("Error getting selected conversation:", error);
    return null;
  }
}

/**
 * Theme Preferences Management
 */

export async function saveThemePreferences(
  prefs: ThemePreferences
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.THEME_PREFS, JSON.stringify(prefs));
  } catch (error) {
    console.error("Error saving theme preferences:", error);
  }
}

export async function getThemePreferences(): Promise<ThemePreferences | null> {
  try {
    const prefsJson = await AsyncStorage.getItem(KEYS.THEME_PREFS);
    return prefsJson ? JSON.parse(prefsJson) : null;
  } catch (error) {
    console.error("Error getting theme preferences:", error);
    return null;
  }
}

/**
 * Clear all caches on logout (except theme preferences)
 */
export async function clearAllCachesExceptPrefs(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEYS.DRAFTS,
      KEYS.OUTBOUND_QUEUE,
      KEYS.SELECTED_CONVERSATION,
      KEYS.MESSAGE_CACHE,
      KEYS.DISPLAY_NAME_CACHE,
    ]);
    // console.log("Cleared all caches except theme preferences");
  } catch (error) {
    console.error("Error clearing caches:", error);
  }
}

/**
 * Calculate retry delay using exponential backoff
 * @param retryCount - The number of retries already attempted
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (capped at 32s)
  const baseDelay = 1000; // 1 second
  const maxDelay = 32000; // 32 seconds
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  return delay;
}

/**
 * Check if a queued message should be retried
 * @param message - The queued message
 * @returns True if the message should be retried
 */
export function shouldRetryMessage(message: QueuedMessage): boolean {
  if (message.retryCount >= 6) {
    // Max 6 retries (corresponds to 32s max delay)
    return false;
  }

  if (!message.lastRetryAt) {
    return true; // First retry
  }

  const now = Date.now();
  const timeSinceLastRetry = now - message.lastRetryAt;
  const requiredDelay = calculateRetryDelay(message.retryCount);

  return timeSinceLastRetry >= requiredDelay;
}

/**
 * Message Cache Management
 */

/**
 * Cache messages for instant loading
 */
export async function cacheMessages(
  conversationId: string,
  messages: any[] // Use Message type from api.ts
): Promise<void> {
  try {
    const cacheJson = await AsyncStorage.getItem(KEYS.MESSAGE_CACHE);
    const cache: MessageCache = cacheJson ? JSON.parse(cacheJson) : {};

    // Convert messages to cacheable format (limit to last 30)
    const cachedMessages: CachedMessage[] = messages.slice(-30).map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      type: msg.type,
      text: msg.text,
      image: msg.image,
      timestamp: msg.timestamp.getTime(), // Convert Date to number
      status: msg.status,
      tempId: msg.tempId,
    }));

    cache[conversationId] = {
      messages: cachedMessages,
      cachedAt: Date.now(),
    };

    await AsyncStorage.setItem(KEYS.MESSAGE_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error("Error caching messages:", error);
  }
}

/**
 * Get cached messages for instant display
 */
export async function getCachedMessages(
  conversationId: string
): Promise<CachedMessage[] | null> {
  try {
    const cacheJson = await AsyncStorage.getItem(KEYS.MESSAGE_CACHE);
    if (!cacheJson) return null;

    const cache: MessageCache = JSON.parse(cacheJson);
    const conversationCache = cache[conversationId];

    if (!conversationCache) return null;

    // Check if cache is expired (24 hours)
    const cacheAge = Date.now() - conversationCache.cachedAt;
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > CACHE_EXPIRY) {
      // Remove expired cache
      delete cache[conversationId];
      await AsyncStorage.setItem(KEYS.MESSAGE_CACHE, JSON.stringify(cache));
      return null;
    }

    return conversationCache.messages;
  } catch (error) {
    console.error("Error getting cached messages:", error);
    return null;
  }
}

/**
 * Clear message cache for a conversation
 */
export async function clearMessageCache(conversationId: string): Promise<void> {
  try {
    const cacheJson = await AsyncStorage.getItem(KEYS.MESSAGE_CACHE);
    if (!cacheJson) return;

    const cache: MessageCache = JSON.parse(cacheJson);
    delete cache[conversationId];
    await AsyncStorage.setItem(KEYS.MESSAGE_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error("Error clearing message cache:", error);
  }
}

/**
 * Clear all message caches (called on logout)
 */
export async function clearAllMessageCaches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.MESSAGE_CACHE);
    // console.log("Cleared all message caches");
  } catch (error) {
    console.error("Error clearing all message caches:", error);
  }
}

/**
 * Display Name Cache Management
 */

export interface DisplayNameCache {
  [userId: string]: {
    displayName: string;
    cachedAt: number;
  };
}

/**
 * Cache a user's display name
 */
export async function cacheDisplayName(
  userId: string,
  displayName: string
): Promise<void> {
  try {
    const cacheJson = await AsyncStorage.getItem(KEYS.DISPLAY_NAME_CACHE);
    const cache: DisplayNameCache = cacheJson ? JSON.parse(cacheJson) : {};

    cache[userId] = {
      displayName,
      cachedAt: Date.now(),
    };

    await AsyncStorage.setItem(KEYS.DISPLAY_NAME_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error("Error caching display name:", error);
  }
}

/**
 * Get a cached display name
 */
export async function getCachedDisplayName(
  userId: string
): Promise<string | null> {
  try {
    const cacheJson = await AsyncStorage.getItem(KEYS.DISPLAY_NAME_CACHE);
    if (!cacheJson) return null;

    const cache: DisplayNameCache = JSON.parse(cacheJson);
    const userCache = cache[userId];

    if (!userCache) return null;

    // Check if cache is expired (7 days)
    const cacheAge = Date.now() - userCache.cachedAt;
    const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (cacheAge > CACHE_EXPIRY) {
      // Remove expired cache
      delete cache[userId];
      await AsyncStorage.setItem(
        KEYS.DISPLAY_NAME_CACHE,
        JSON.stringify(cache)
      );
      return null;
    }

    return userCache.displayName;
  } catch (error) {
    console.error("Error getting cached display name:", error);
    return null;
  }
}

/**
 * Clear cached display name for a user (useful when user updates their profile)
 */
export async function clearDisplayNameCache(userId?: string): Promise<void> {
  try {
    if (userId) {
      const cacheJson = await AsyncStorage.getItem(KEYS.DISPLAY_NAME_CACHE);
      if (!cacheJson) return;

      const cache: DisplayNameCache = JSON.parse(cacheJson);
      delete cache[userId];
      await AsyncStorage.setItem(
        KEYS.DISPLAY_NAME_CACHE,
        JSON.stringify(cache)
      );
    } else {
      await AsyncStorage.removeItem(KEYS.DISPLAY_NAME_CACHE);
    }
  } catch (error) {
    console.error("Error clearing display name cache:", error);
  }
}
