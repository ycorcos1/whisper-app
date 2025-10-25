/**
 * Translation and Message Composition Service
 * Handles message translation and contextual response generation
 */

import * as functions from "firebase-functions";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Initialize OpenAI client
const openai = new ChatOpenAI({
  apiKey: functions.config().openai?.api_key,
  model: "gpt-4o-mini",
  temperature: 0.7,
});

/**
 * Translate text to a target language
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  try {
    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLanguage}${
      sourceLanguage ? ` from ${sourceLanguage}` : ""
    }. Return only the translated text, no explanations or additional text.`;

    const messages = [new SystemMessage(systemPrompt), new HumanMessage(text)];

    const response = await openai.invoke(messages);
    return response.content as string;
  } catch (error) {
    functions.logger.error("Translation error:", error);
    throw new Error("Failed to translate text");
  }
}

/**
 * Detect the language of text
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const systemPrompt = `Detect the language of the following text. Return only the language name in English (e.g., "Spanish", "French", "English").`;

    const messages = [new SystemMessage(systemPrompt), new HumanMessage(text)];

    const response = await openai.invoke(messages);
    return response.content as string;
  } catch (error) {
    functions.logger.error("Language detection error:", error);
    throw new Error("Failed to detect language");
  }
}

/**
 * Generate a contextual response based on conversation history
 */
export async function generateContextualResponse(
  conversationHistory: Array<{
    senderId: string;
    text: string;
    timestamp: Date;
    senderName?: string;
  }>,
  currentUserId: string,
  context?: string
): Promise<string> {
  try {
    // Build conversation context
    const conversationText = conversationHistory
      .map((msg) => {
        const sender =
          msg.senderId === currentUserId ? "You" : msg.senderName || "Other";
        return `${sender}: ${msg.text}`;
      })
      .join("\n");

    const systemPrompt = `You are a helpful assistant that generates contextual responses for conversations. Based on the conversation history below, generate an appropriate response that the user might want to send. The response should be natural, contextually relevant, and match the tone of the conversation.

Conversation History:
${conversationText}

${context ? `Additional Context: ${context}` : ""}

Generate a single, natural response that the user might want to send. Return only the response text, no explanations.`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage("Generate a contextual response for this conversation."),
    ];

    const response = await openai.invoke(messages);
    return response.content as string;
  } catch (error) {
    functions.logger.error("Response generation error:", error);
    throw new Error("Failed to generate contextual response");
  }
}

/**
 * Get conversation messages for context
 */
export async function getConversationMessages(
  conversationId: string,
  currentUserId: string,
  limit: number = 50
): Promise<
  Array<{
    senderId: string;
    text: string;
    timestamp: Date;
    senderName?: string;
  }>
> {
  try {
    const admin = require("firebase-admin");
    const messagesRef = admin
      .firestore()
      .collection("conversations")
      .doc(conversationId)
      .collection("messages");

    // Get recent messages, ordered by timestamp descending
    const snapshot = await messagesRef
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages = [];
    let lastUserMessageIndex = -1;

    // Find the last message sent by the current user
    for (let i = 0; i < snapshot.docs.length; i++) {
      const doc = snapshot.docs[i];
      const data = doc.data();
      if (data.senderId === currentUserId) {
        lastUserMessageIndex = i;
        break;
      }
    }

    // Get messages from the start until the last user message
    const relevantMessages = snapshot.docs
      .slice(lastUserMessageIndex + 1)
      .reverse();

    for (const doc of relevantMessages) {
      const data = doc.data();
      if (data.type === "text" && data.text) {
        messages.push({
          senderId: data.senderId,
          text: data.text,
          timestamp: data.timestamp.toDate(),
          senderName: data.senderName,
        });
      }
    }

    return messages;
  } catch (error) {
    functions.logger.error("Error getting conversation messages:", error);
    throw new Error("Failed to get conversation messages");
  }
}
