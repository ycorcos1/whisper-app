/**
 * Translation API Service
 * Client-side service for calling Firebase Functions for translation and message composition
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";

// Define function callables
const translateText = httpsCallable(functions, "casperTranslate");
const detectLanguage = httpsCallable(functions, "casperDetectLanguage");
const generateResponse = httpsCallable(functions, "casperGenerateResponse");
const translateAndSend = httpsCallable(functions, "casperTranslateAndSend");

export interface TranslationResult {
  success: boolean;
  translatedText: string;
  originalText: string;
  targetLanguage: string;
  sourceLanguage: string;
}

export interface LanguageDetectionResult {
  success: boolean;
  detectedLanguage: string;
  text: string;
}

export interface ResponseGenerationResult {
  success: boolean;
  generatedResponse: string;
  conversationHistory: number;
}

export interface TranslateAndSendResult {
  success: boolean;
  messageId: string;
  translatedText: string;
  originalText: string;
  targetLanguage: string;
}

/**
 * Translate text to a target language
 */
export async function translateMessage(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> {
  try {
    const result = await translateText({
      text,
      targetLanguage,
      sourceLanguage,
    });

    return result.data as TranslationResult;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate message");
  }
}

/**
 * Detect the language of text
 */
export async function detectMessageLanguage(
  text: string
): Promise<LanguageDetectionResult> {
  try {
    const result = await detectLanguage({ text });
    return result.data as LanguageDetectionResult;
  } catch (error) {
    console.error("Language detection error:", error);
    throw new Error("Failed to detect language");
  }
}

/**
 * Generate a contextual response based on conversation history
 */
export async function generateContextualResponse(
  conversationId: string,
  context?: string
): Promise<ResponseGenerationResult> {
  try {
    const result = await generateResponse({
      conversationId,
      context,
    });

    return result.data as ResponseGenerationResult;
  } catch (error) {
    console.error("Response generation error:", error);
    throw new Error("Failed to generate contextual response");
  }
}

/**
 * Translate and send a message directly
 */
export async function translateAndSendMessage(
  text: string,
  targetLanguage: string,
  conversationId: string,
  sourceLanguage?: string
): Promise<TranslateAndSendResult> {
  try {
    const result = await translateAndSend({
      text,
      targetLanguage,
      conversationId,
      sourceLanguage,
    });

    return result.data as TranslateAndSendResult;
  } catch (error) {
    console.error("Translate and send error:", error);
    throw new Error("Failed to translate and send message");
  }
}
