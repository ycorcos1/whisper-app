/**
 * Translation and Message Composition Controller
 * Handles translation and message generation requests in the Ask tab
 */

import {
  translateMessage,
  generateContextualResponse,
  translateAndSendMessage,
} from "../../services/translationApi";

/**
 * Map common language names to standardized language codes
 */
function normalizeLanguageName(language: string): string {
  const languageMap: { [key: string]: string } = {
    // Common English names
    spanish: "Spanish",
    french: "French",
    german: "German",
    italian: "Italian",
    portuguese: "Portuguese",
    russian: "Russian",
    chinese: "Chinese",
    japanese: "Japanese",
    korean: "Korean",
    arabic: "Arabic",
    hindi: "Hindi",
    dutch: "Dutch",
    swedish: "Swedish",
    norwegian: "Norwegian",
    danish: "Danish",
    finnish: "Finnish",
    polish: "Polish",
    czech: "Czech",
    hungarian: "Hungarian",
    romanian: "Romanian",
    bulgarian: "Bulgarian",
    croatian: "Croatian",
    serbian: "Serbian",
    slovak: "Slovak",
    slovenian: "Slovenian",
    lithuanian: "Lithuanian",
    latvian: "Latvian",
    estonian: "Estonian",
    greek: "Greek",
    turkish: "Turkish",
    hebrew: "Hebrew",
    thai: "Thai",
    vietnamese: "Vietnamese",
    indonesian: "Indonesian",
    malay: "Malay",
    tagalog: "Tagalog",
    ukrainian: "Ukrainian",
    belarusian: "Belarusian",
    macedonian: "Macedonian",
    albanian: "Albanian",
    maltese: "Maltese",
    icelandic: "Icelandic",
    irish: "Irish",
    welsh: "Welsh",
    scottish: "Scottish Gaelic",
    basque: "Basque",
    catalan: "Catalan",
    galician: "Galician",
    esperanto: "Esperanto",

    // Language codes
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
    nl: "Dutch",
    sv: "Swedish",
    no: "Norwegian",
    da: "Danish",
    fi: "Finnish",
    pl: "Polish",
    cs: "Czech",
    hu: "Hungarian",
    ro: "Romanian",
    bg: "Bulgarian",
    hr: "Croatian",
    sr: "Serbian",
    sk: "Slovak",
    sl: "Slovenian",
    lt: "Lithuanian",
    lv: "Latvian",
    et: "Estonian",
    el: "Greek",
    tr: "Turkish",
    he: "Hebrew",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    tl: "Tagalog",
    uk: "Ukrainian",
    be: "Belarusian",
    mk: "Macedonian",
    sq: "Albanian",
    mt: "Maltese",
    is: "Icelandic",
    ga: "Irish",
    cy: "Welsh",
    gd: "Scottish Gaelic",
    eu: "Basque",
    ca: "Catalan",
    gl: "Galician",
    eo: "Esperanto",
  };

  const normalized = language.toLowerCase().trim();
  return languageMap[normalized] || language;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface MessageCompositionRequest {
  conversationId: string;
  context?: string;
}

export interface TranslationAndSendRequest {
  text: string;
  targetLanguage: string;
  conversationId: string;
  sourceLanguage?: string;
}

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  originalText: string;
  targetLanguage: string;
  sourceLanguage: string;
}

export interface MessageCompositionResult {
  success: boolean;
  generatedResponse: string;
  conversationHistory: number;
}

export interface TranslationAndSendResult {
  success: boolean;
  messageId: string;
  translatedText: string;
  originalText: string;
  targetLanguage: string;
}

/**
 * Handle translation request
 */
export async function handleTranslationRequest(
  request: TranslationRequest
): Promise<TranslationResult> {
  try {
    const result = await translateMessage(
      request.text,
      request.targetLanguage,
      request.sourceLanguage
    );

    return result;
  } catch (error) {
    console.error("Translation request error:", error);
    throw new Error("Failed to translate message");
  }
}

/**
 * Handle message composition request
 */
export async function handleMessageCompositionRequest(
  request: MessageCompositionRequest
): Promise<MessageCompositionResult> {
  try {
    const result = await generateContextualResponse(
      request.conversationId,
      request.context
    );

    return result;
  } catch (error) {
    console.error("Message composition request error:", error);
    throw new Error("Failed to generate contextual response");
  }
}

/**
 * Handle translation and send request
 */
export async function handleTranslationAndSendRequest(
  request: TranslationAndSendRequest
): Promise<TranslationAndSendResult> {
  try {
    const result = await translateAndSendMessage(
      request.text,
      request.targetLanguage,
      request.conversationId,
      request.sourceLanguage
    );

    return result;
  } catch (error) {
    console.error("Translation and send request error:", error);
    throw new Error("Failed to translate and send message");
  }
}

/**
 * Parse translation request from user query
 */
export function parseTranslationRequest(query: string): {
  type:
    | "translate"
    | "translate_and_send"
    | "detect_language"
    | "generate_response"
    | "unknown";
  text?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
  context?: string;
} {
  const lowerQuery = query.toLowerCase().trim();

  // Debug logging
  // console.log("Parsing translation request:", lowerQuery);

  // Check for translation and send pattern (more flexible)
  const translateAndSendPatterns = [
    /translate\s+(?:this\s+)?(?:message\s+)?to\s+(\w+)\s+and\s+send(?:\s+it)?[:\s]*(.+)/,
    /translate\s+(.+?)\s+to\s+(\w+)\s+and\s+send(?:\s+it)?/,
    /send\s+(?:this\s+)?(?:message\s+)?in\s+(\w+)[:\s]*(.+)/,
    /send\s+(.+?)\s+in\s+(\w+)/,
    /translate\s+and\s+send\s+(.+?)\s+to\s+(\w+)/,
    /convert\s+(.+?)\s+to\s+(\w+)\s+and\s+send/,
    // Handle cases where no language is specified - default to Spanish
    /translate\s+(?:this\s+)?(?:message\s+)?and\s+send[:\s]*(.+)/,
    /translate\s+and\s+send[:\s]*(.+)/,
  ];

  for (const pattern of translateAndSendPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      // console.log(
      //   "Matched translate_and_send pattern:",
      //   pattern.source,
      //   "with groups:",
      //   match
      // );
      // Handle patterns without language specification (default to Spanish)
      if (pattern.source.includes("and\\s+send[:s]*(.+)")) {
        // console.log("Using default Spanish for translate_and_send");
        return {
          type: "translate_and_send",
          text: match[1].trim(),
          targetLanguage: "Spanish", // Default language
        };
      }
      // Handle different capture group orders
      else if (pattern.source.includes("(.+?)\\s+to\\s+(\\w+)")) {
        return {
          type: "translate_and_send",
          text: match[1].trim(),
          targetLanguage: normalizeLanguageName(match[2]),
        };
      } else {
        return {
          type: "translate_and_send",
          targetLanguage: normalizeLanguageName(match[1]),
          text: match[2].trim(),
        };
      }
    }
  }

  // Check for simple translation pattern (more flexible)
  const translatePatterns = [
    /translate\s+(?:this\s+)?(?:message\s+)?to\s+(\w+)[:\s]*(.+)/,
    /translate\s+(.+?)\s+to\s+(\w+)/,
    /convert\s+(?:this\s+)?(?:message\s+)?to\s+(\w+)[:\s]*(.+)/,
    /convert\s+(.+?)\s+to\s+(\w+)/,
    /what\s+is\s+(.+?)\s+in\s+(\w+)/,
    /how\s+do\s+you\s+say\s+(.+?)\s+in\s+(\w+)/,
    /say\s+(.+?)\s+in\s+(\w+)/,
  ];

  for (const pattern of translatePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      // Handle different capture group orders
      if (
        pattern.source.includes("(.+?)\\s+to\\s+(\\w+)") ||
        pattern.source.includes("(.+?)\\s+in\\s+(\\w+)")
      ) {
        return {
          type: "translate",
          text: match[1].trim(),
          targetLanguage: normalizeLanguageName(match[2]),
        };
      } else {
        return {
          type: "translate",
          targetLanguage: normalizeLanguageName(match[1]),
          text: match[2].trim(),
        };
      }
    }
  }

  // Check for language detection pattern (more flexible)
  const detectPatterns = [
    /what\s+language\s+is\s+(?:this\s+)?(?:message\s+)?[:\s]*(.+)/,
    /detect\s+(?:the\s+)?language\s+of\s+(.+)/,
    /what\s+language\s+is\s+(.+)/,
    /identify\s+(?:the\s+)?language\s+of\s+(.+)/,
    /which\s+language\s+is\s+(.+)/,
    /recognize\s+(?:the\s+)?language\s+of\s+(.+)/,
    /what\s+is\s+(?:the\s+)?language\s+of\s+(.+)/,
  ];

  for (const pattern of detectPatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      return {
        type: "detect_language",
        text: match[1].trim(),
      };
    }
  }

  // Check for response generation pattern (more flexible)
  const generatePatterns = [
    /write\s+(?:a\s+)?response\s+(?:to\s+(\w+)\s+)?(?:based\s+on\s+(?:our\s+)?conversation\s*)?(?:[:\s]*(.+))?/,
    /generate\s+(?:a\s+)?response\s+(?:for\s+(\w+)\s+)?(?:[:\s]*(.+))?/,
    /compose\s+(?:a\s+)?message\s+(?:for\s+(\w+)\s+)?(?:[:\s]*(.+))?/,
    /create\s+(?:a\s+)?reply\s+(?:for\s+(\w+)\s+)?(?:[:\s]*(.+))?/,
    /draft\s+(?:a\s+)?message\s+(?:for\s+(\w+)\s+)?(?:[:\s]*(.+))?/,
  ];

  for (const pattern of generatePatterns) {
    const match = lowerQuery.match(pattern);
    if (match) {
      return {
        type: "generate_response",
        context: match[2]?.trim() || match[1]?.trim(),
      };
    }
  }

  // console.log("No pattern matched, returning unknown");
  return { type: "unknown" };
}
