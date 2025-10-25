/**
 * Translation and Message Composition Firebase Functions
 * Exposes translation and message generation capabilities as callable functions
 */

import * as functions from "firebase-functions";
import {
  translateText,
  detectLanguage,
  generateContextualResponse,
  getConversationMessages,
} from "./translation";

/**
 * Translate text to a target language
 */
export const casperTranslate = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { text, targetLanguage, sourceLanguage } = data;

    if (!text || !targetLanguage) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Text and target language are required"
      );
    }

    const translatedText = await translateText(
      text,
      targetLanguage,
      sourceLanguage
    );

    return {
      success: true,
      translatedText,
      originalText: text,
      targetLanguage,
      sourceLanguage: sourceLanguage || "auto-detected",
    };
  } catch (error) {
    functions.logger.error("Translation function error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to translate text"
    );
  }
});

/**
 * Detect the language of text
 */
export const casperDetectLanguage = functions.https.onCall(
  async (data, context) => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { text } = data;

      if (!text) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Text is required"
        );
      }

      const detectedLanguage = await detectLanguage(text);

      return {
        success: true,
        detectedLanguage,
        text,
      };
    } catch (error) {
      functions.logger.error("Language detection function error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to detect language"
      );
    }
  }
);

/**
 * Generate a contextual response based on conversation history
 */
export const casperGenerateResponse = functions.https.onCall(
  async (data, context) => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { conversationId, context: additionalContext } = data;

      if (!conversationId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Conversation ID is required"
        );
      }

      const currentUserId = context.auth.uid;
      const conversationHistory = await getConversationMessages(
        conversationId,
        currentUserId
      );
      const generatedResponse = await generateContextualResponse(
        conversationHistory,
        currentUserId,
        additionalContext
      );

      return {
        success: true,
        generatedResponse,
        conversationHistory: conversationHistory.length,
      };
    } catch (error) {
      functions.logger.error("Response generation function error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate contextual response"
      );
    }
  }
);

/**
 * Translate and send a message
 */
export const casperTranslateAndSend = functions.https.onCall(
  async (data, context) => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { text, targetLanguage, conversationId, sourceLanguage } = data;

      if (!text || !targetLanguage || !conversationId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Text, target language, and conversation ID are required"
        );
      }

      const currentUserId = context.auth.uid;
      const translatedText = await translateText(
        text,
        targetLanguage,
        sourceLanguage
      );

      // Send the translated message
      const admin = require("firebase-admin");
      const messagesRef = admin
        .firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages");

      const messageData = {
        senderId: currentUserId,
        type: "text",
        text: translatedText,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "sent",
      };

      const docRef = await messagesRef.add(messageData);

      // Update conversation's lastMessage
      const conversationRef = admin
        .firestore()
        .collection("conversations")
        .doc(conversationId);

      await conversationRef.update({
        lastMessage: {
          text: translatedText,
          senderId: currentUserId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        messageId: docRef.id,
        translatedText,
        originalText: text,
        targetLanguage,
      };
    } catch (error) {
      functions.logger.error("Translate and send function error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to translate and send message"
      );
    }
  }
);
