/**
 * Language Detector
 * Utilities for detecting languages in conversation messages
 */

import {
  firebaseFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "../../lib/firebase";
import { detectMessageLanguage as detectLanguageFromAPI } from "../../services/translationApi";
import { SupportedLanguage, getLanguageName } from "./types";

// Cache for language detection results
const detectionCache = new Map<
  string,
  { language: string; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Sample random messages from an array
 */
function sampleMessages<T>(messages: T[], count: number): T[] {
  if (messages.length <= count) return messages;

  const shuffled = [...messages].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of detectionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      detectionCache.delete(key);
    }
  }
}

/**
 * Detect the primary language of a conversation
 * Scans recent messages from other users and detects their language
 *
 * @param conversationId - The conversation ID
 * @param currentUserId - Current user's ID (to filter out own messages)
 * @returns Detected language name (e.g., "Spanish", "French")
 */
export async function detectConversationLanguage(
  conversationId: string,
  currentUserId: string
): Promise<string> {
  try {
    // Check cache first
    const cacheKey = `conv_${conversationId}`;
    const cached = detectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.language;
    }

    // Fetch recent messages
    const messagesRef = collection(
      firebaseFirestore,
      "conversations",
      conversationId,
      "messages"
    );
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(20));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return "English"; // Default
    }

    // Filter out current user's messages
    const otherUserMessages = snapshot.docs
      .map((doc) => doc.data())
      .filter(
        (msg) =>
          msg.senderId !== currentUserId && msg.text && msg.text.length > 10
      );

    if (otherUserMessages.length === 0) {
      return "English"; // Default
    }

    // Sample 5 random messages to detect language
    const sampled = sampleMessages(otherUserMessages, 5);

    // Detect language for each sample
    const detections: { [language: string]: number } = {};

    for (const message of sampled) {
      try {
        const result = await detectMessageLanguage(message.text);
        detections[result] = (detections[result] || 0) + 1;
      } catch (error) {
        console.warn("Language detection failed for message:", error);
      }
    }

    // Find most common language
    let mostCommon = "English";
    let highestCount = 0;

    for (const [lang, count] of Object.entries(detections)) {
      if (count > highestCount) {
        highestCount = count;
        mostCommon = lang;
      }
    }

    // Cache result
    detectionCache.set(cacheKey, {
      language: mostCommon,
      timestamp: Date.now(),
    });

    // Clean expired cache entries
    cleanExpiredCache();

    return mostCommon;
  } catch (error) {
    console.error("Error detecting conversation language:", error);
    return "English"; // Fallback
  }
}

/**
 * Detect language of a single message
 *
 * @param text - Message text
 * @returns Language name (e.g., "Spanish", "French", "English")
 */
export async function detectMessageLanguage(text: string): Promise<string> {
  if (!text || text.trim().length < 10) {
    return "English"; // Too short to detect
  }

  try {
    // Check cache
    const cacheKey = `msg_${text.slice(0, 50)}`; // Use first 50 chars as key
    const cached = detectionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.language;
    }

    // Call detection API
    const result = await detectLanguageFromAPI(text);
    const language = result.detectedLanguage || "English";

    // Cache result
    detectionCache.set(cacheKey, {
      language,
      timestamp: Date.now(),
    });

    return language;
  } catch (error) {
    console.error("Error detecting message language:", error);
    return "English"; // Fallback
  }
}

/**
 * Clear detection cache (useful when switching conversations)
 */
export function clearDetectionCache(): void {
  detectionCache.clear();
}

/**
 * Clear cache for specific conversation
 */
export function clearConversationCache(conversationId: string): void {
  const cacheKey = `conv_${conversationId}`;
  detectionCache.delete(cacheKey);
}
