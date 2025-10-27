/**
 * Translator Mode Types
 * Type definitions for the translator feature in Ask tab
 */

/**
 * Supported languages for translation
 */
export type SupportedLanguage = "English" | "Spanish" | "French" | "Italian";

/**
 * Translated message with both original and translated text
 */
export interface TranslatedMessage {
  id: string;
  senderId: string;
  senderName?: string;
  originalText: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
  isOwn: boolean;
  translationError?: string;
  showOriginal?: boolean; // UI state for expand/collapse
}

/**
 * Translation cache entry
 */
export interface CachedTranslation {
  text: string;
  sourceLanguage: string;
  timestamp: number;
}

/**
 * Translation cache structure
 * messageId -> targetLanguage -> CachedTranslation
 */
export interface TranslationCacheMap {
  [messageId: string]: {
    [targetLanguage: string]: CachedTranslation;
  };
}

/**
 * Translator state
 */
export interface TranslatorState {
  enabled: boolean;
  targetLanguage: SupportedLanguage;
  conversationLanguage: string; // Detected language of other user
  messages: TranslatedMessage[];
  isLoading: boolean;
  isTranslating: boolean;
  error: string | null;
}

/**
 * Language metadata
 */
export interface LanguageMetadata {
  name: SupportedLanguage;
  code: string; // ISO 639-1 code
  flag: string; // Emoji flag
}

/**
 * Available languages configuration
 */
export const AVAILABLE_LANGUAGES: LanguageMetadata[] = [
  { name: "English", code: "en", flag: "🇬🇧" },
  { name: "Spanish", code: "es", flag: "🇪🇸" },
  { name: "French", code: "fr", flag: "🇫🇷" },
  { name: "Italian", code: "it", flag: "🇮🇹" },
];

/**
 * Get language code from name
 */
export function getLanguageCode(language: string): string {
  const lang = AVAILABLE_LANGUAGES.find((l) => l.name === language);
  return lang?.code || "en";
}

/**
 * Get language flag from name
 */
export function getLanguageFlag(language: string): string {
  const lang = AVAILABLE_LANGUAGES.find((l) => l.name === language);
  return lang?.flag || "🌐";
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): SupportedLanguage {
  const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
  return lang?.name || "English";
}
