/**
 * Translation Cache Manager
 * Manages caching of translated messages to avoid re-translation
 */

import { CachedTranslation, TranslationCacheMap } from "./types";

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100; // Maximum number of cached translations

/**
 * Translation Cache Class
 * Manages in-memory cache of translations
 */
class TranslationCacheManager {
  private cache: TranslationCacheMap = {};
  private accessTimes: Map<string, number> = new Map();

  /**
   * Get cached translation for a message
   *
   * @param messageId - Message ID
   * @param targetLanguage - Target language
   * @returns Cached translation or null
   */
  getCachedTranslation(
    messageId: string,
    targetLanguage: string
  ): CachedTranslation | null {
    const messageCache = this.cache[messageId];
    if (!messageCache) return null;

    const translation = messageCache[targetLanguage];
    if (!translation) return null;

    // Check if expired
    if (Date.now() - translation.timestamp > CACHE_TTL) {
      delete messageCache[targetLanguage];
      return null;
    }

    // Update access time
    this.accessTimes.set(`${messageId}_${targetLanguage}`, Date.now());

    return translation;
  }

  /**
   * Cache a translation
   *
   * @param messageId - Message ID
   * @param targetLanguage - Target language
   * @param text - Translated text
   * @param sourceLanguage - Source language
   */
  cacheTranslation(
    messageId: string,
    targetLanguage: string,
    text: string,
    sourceLanguage: string
  ): void {
    // Ensure cache for message exists
    if (!this.cache[messageId]) {
      this.cache[messageId] = {};
    }

    // Store translation
    this.cache[messageId][targetLanguage] = {
      text,
      sourceLanguage,
      timestamp: Date.now(),
    };

    // Update access time
    this.accessTimes.set(`${messageId}_${targetLanguage}`, Date.now());

    // Check cache size and evict if needed
    this.evictIfNeeded();
  }

  /**
   * Evict old entries if cache is too large
   * Uses LRU (Least Recently Used) strategy
   */
  private evictIfNeeded(): void {
    const totalEntries = Object.keys(this.cache).reduce((count, messageId) => {
      return count + Object.keys(this.cache[messageId]).length;
    }, 0);

    if (totalEntries <= MAX_CACHE_SIZE) return;

    // Sort by access time (oldest first)
    const sorted = Array.from(this.accessTimes.entries()).sort(
      (a, b) => a[1] - b[1]
    );

    // Evict oldest 20% of entries
    const toEvict = Math.ceil(totalEntries * 0.2);
    for (let i = 0; i < toEvict && i < sorted.length; i++) {
      const [key] = sorted[i];
      const [messageId, targetLanguage] = key.split("_");

      if (this.cache[messageId]) {
        delete this.cache[messageId][targetLanguage];

        // Remove message cache if empty
        if (Object.keys(this.cache[messageId]).length === 0) {
          delete this.cache[messageId];
        }
      }

      this.accessTimes.delete(key);
    }
  }

  /**
   * Clear all expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();

    for (const messageId in this.cache) {
      for (const targetLanguage in this.cache[messageId]) {
        const translation = this.cache[messageId][targetLanguage];
        if (now - translation.timestamp > CACHE_TTL) {
          delete this.cache[messageId][targetLanguage];
          this.accessTimes.delete(`${messageId}_${targetLanguage}`);
        }
      }

      // Remove message cache if empty
      if (Object.keys(this.cache[messageId]).length === 0) {
        delete this.cache[messageId];
      }
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache = {};
    this.accessTimes.clear();
  }

  /**
   * Clear cache for a specific message
   */
  clearMessageCache(messageId: string): void {
    if (this.cache[messageId]) {
      // Remove access times
      for (const targetLanguage in this.cache[messageId]) {
        this.accessTimes.delete(`${messageId}_${targetLanguage}`);
      }

      delete this.cache[messageId];
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    messageCount: number;
    avgTranslationsPerMessage: number;
  } {
    const messageCount = Object.keys(this.cache).length;
    const totalEntries = Object.keys(this.cache).reduce((count, messageId) => {
      return count + Object.keys(this.cache[messageId]).length;
    }, 0);

    return {
      totalEntries,
      messageCount,
      avgTranslationsPerMessage:
        messageCount > 0 ? totalEntries / messageCount : 0,
    };
  }
}

// Export singleton instance
export const translationCache = new TranslationCacheManager();
