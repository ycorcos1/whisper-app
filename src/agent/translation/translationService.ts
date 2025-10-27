/**
 * Translation Service
 * High-level service for translating messages with caching and retry logic
 */

import {
  translateMessage,
  TranslationResult,
} from "../../services/translationApi";
import { translationCache } from "./translationCache";
import { SupportedLanguage } from "./types";

// Rate limiting
const translationQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
const MIN_DELAY_BETWEEN_TRANSLATIONS = 500; // 500ms between translations

/**
 * Process translation queue with rate limiting
 */
async function processQueue(): void {
  if (isProcessingQueue || translationQueue.length === 0) return;

  isProcessingQueue = true;

  while (translationQueue.length > 0) {
    const task = translationQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error("Translation queue task failed:", error);
      }

      // Rate limit: wait before next translation
      if (translationQueue.length > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_DELAY_BETWEEN_TRANSLATIONS)
        );
      }
    }
  }

  isProcessingQueue = false;
}

/**
 * Add translation task to queue
 */
function queueTranslation(task: () => Promise<void>): void {
  translationQueue.push(task);
  processQueue();
}

/**
 * Translate message with caching and retry logic
 *
 * @param messageId - Message ID for caching
 * @param text - Text to translate
 * @param targetLanguage - Target language
 * @param sourceLanguage - Source language (optional, will auto-detect)
 * @returns Translation result
 */
export async function translateMessageWithCache(
  messageId: string,
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage?: string
): Promise<TranslationResult> {
  // Check cache first
  const cached = translationCache.getCachedTranslation(
    messageId,
    targetLanguage
  );
  if (cached) {
    return {
      success: true,
      translatedText: cached.text,
      originalText: text,
      targetLanguage,
      sourceLanguage: cached.sourceLanguage,
    };
  }

  // Translate with retry logic
  let lastError: Error | null = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await translateMessage(
        text,
        targetLanguage,
        sourceLanguage
      );

      // Cache successful translation
      if (result.success) {
        translationCache.cacheTranslation(
          messageId,
          targetLanguage,
          result.translatedText,
          result.sourceLanguage
        );
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Translation attempt ${attempt} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  // All retries failed
  throw new Error(
    `Translation failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Batch translate multiple messages
 * Processes them with rate limiting
 *
 * @param messages - Array of messages to translate
 * @param targetLanguage - Target language
 * @returns Array of translation results
 */
export async function batchTranslateMessages(
  messages: Array<{ id: string; text: string; sourceLanguage?: string }>,
  targetLanguage: SupportedLanguage,
  onProgress?: (current: number, total: number) => void
): Promise<Array<TranslationResult | { error: string }>> {
  const results: Array<TranslationResult | { error: string }> = [];
  let completed = 0;

  for (const message of messages) {
    const translationPromise = new Promise<
      TranslationResult | { error: string }
    >((resolve) => {
      queueTranslation(async () => {
        try {
          const result = await translateMessageWithCache(
            message.id,
            message.text,
            targetLanguage,
            message.sourceLanguage
          );
          resolve(result);
        } catch (error) {
          resolve({ error: (error as Error).message });
        } finally {
          completed++;
          if (onProgress) {
            onProgress(completed, messages.length);
          }
        }
      });
    });

    results.push(await translationPromise);
  }

  return results;
}

/**
 * Check if translation is needed
 * (same language = no translation needed)
 *
 * @param sourceLanguage - Source language
 * @param targetLanguage - Target language
 * @returns True if translation needed
 */
export function isTranslationNeeded(
  sourceLanguage: string,
  targetLanguage: string
): boolean {
  // Normalize language names (case-insensitive)
  const source = sourceLanguage.toLowerCase().trim();
  const target = targetLanguage.toLowerCase().trim();

  return source !== target;
}

/**
 * Clear all translation caches
 */
export function clearAllCaches(): void {
  translationCache.clearCache();
  translationQueue.length = 0; // Clear queue
}
