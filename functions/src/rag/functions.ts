/**
 * Casper RAG Cloud Functions
 * Callable functions for vector search and question answering
 */

import * as functions from "firebase-functions";
import { searchVectors } from "./index";
import { answerQuestion, summarizeConversation } from "./answer";

/**
 * Vector Search Function
 * Searches for relevant messages using vector similarity
 */
export const casperSearch = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to search"
    );
  }

  const { query, conversationId, topK } = data;

  // Validate input
  if (!query || typeof query !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query must be a non-empty string"
    );
  }

  if (query.length > 500) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query too long (max 500 characters)"
    );
  }

  try {
    const results = await searchVectors(query, conversationId, topK || 8);

    return {
      success: true,
      results: results.map((r) => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata,
      })),
    };
  } catch (error) {
    functions.logger.error("Error in casperSearch:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to search"
    );
  }
});

/**
 * Answer Question Function
 * Answers a question using RAG (retrieval + generation)
 */
export const casperAnswer = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to ask questions"
    );
  }

  const { question, conversationId, topK, useLLM } = data;

  // Validate input
  if (!question || typeof question !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Question must be a non-empty string"
    );
  }

  if (question.length < 3) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Question too short (min 3 characters)"
    );
  }

  if (question.length > 500) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Question too long (max 500 characters)"
    );
  }

  try {
    // First, search for relevant sources
    const sources = await searchVectors(question, conversationId, topK || 8);

    // If LLM is disabled or not requested, return template answer
    if (!useLLM) {
      const answer = generateTemplateAnswer(question, sources);
      return {
        success: true,
        answer,
        sources: sources.map((r) => ({
          id: r.id,
          score: r.score,
          metadata: r.metadata,
        })),
        mode: "template",
      };
    }

    // Use LLM for natural language answer
    const result = await answerQuestion(question, conversationId, topK || 8);

    return {
      success: true,
      answer: result.answer,
      sources: result.sources.map((r) => ({
        id: r.id,
        score: r.score,
        metadata: r.metadata,
      })),
      mode: "llm",
    };
  } catch (error) {
    functions.logger.error("Error in casperAnswer:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to answer question"
    );
  }
});

/**
 * Helper: Generate template-based answer from sources
 */
function generateTemplateAnswer(query: string, sources: any[]): string {
  if (sources.length === 0) {
    return `I couldn't find any relevant messages to answer: "${query}"\n\nTry asking about topics that were discussed in this conversation.`;
  }

  // Extract key sentences
  const sentences: string[] = [];
  for (const source of sources) {
    const text = source.metadata.text;
    const sourceSentences = text
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 20);

    sentences.push(...sourceSentences);
    if (sentences.length >= 5) break;
  }

  const keySentences = sentences.slice(0, 5);

  // Build response
  const intro = `Based on ${sources.length} relevant message${
    sources.length > 1 ? "s" : ""
  }, here's what I found:\n\n`;
  const content = keySentences.map((s) => `• ${s}`).join("\n\n");
  const citation = `\n\n📎 ${sources.length} source${
    sources.length > 1 ? "s" : ""
  } found`;

  return intro + content + citation;
}

/**
 * Summarize Conversation Function
 * Generates a summary of a conversation using RAG
 */
export const casperSummarize = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to generate summaries"
    );
  }

  const { conversationId, focusQuery, length, useLLM } = data;

  // Validate input
  if (!conversationId || typeof conversationId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Conversation ID must be a non-empty string"
    );
  }

  const validLengths = ["short", "normal", "long"];
  const summaryLength =
    length && validLengths.includes(length) ? length : "normal";

  try {
    // If LLM is disabled or not requested, return template summary
    if (!useLLM) {
      const summary = await generateTemplateSummary(
        conversationId,
        focusQuery || "recent messages",
        summaryLength
      );
      return {
        success: true,
        summary,
        mode: "template",
      };
    }

    // Use LLM for natural language summary
    const summary = await summarizeConversation(
      conversationId,
      focusQuery,
      summaryLength as "short" | "normal" | "long"
    );

    return {
      success: true,
      summary,
      mode: "llm",
    };
  } catch (error) {
    functions.logger.error("Error in casperSummarize:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to generate summary"
    );
  }
});

/**
 * Helper: Generate template-based summary from sources
 */
async function generateTemplateSummary(
  conversationId: string,
  focusQuery: string,
  length: string
): Promise<string> {
  // Determine topK based on length
  const topK = length === "short" ? 6 : length === "normal" ? 12 : 20;

  // Search for relevant messages
  const sources = await searchVectors(focusQuery, conversationId, topK);

  if (sources.length === 0) {
    return "No messages found in this conversation.";
  }

  // Extract key points from sources
  const keyPoints: string[] = [];
  const timestamps: number[] = [];

  for (const source of sources) {
    const text = source.metadata.text;
    // Extract sentences
    const sentences = text
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 20);

    keyPoints.push(...sentences);
    timestamps.push(source.metadata.createdAt);
  }

  // Get unique, most relevant sentences
  const uniquePoints = [...new Set(keyPoints)];
  const maxPoints = length === "short" ? 3 : length === "normal" ? 5 : 8;
  const topPoints = uniquePoints.slice(0, maxPoints);

  // Format timestamps
  const minDate = new Date(Math.min(...timestamps));
  const maxDate = new Date(Math.max(...timestamps));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Build summary
  const header = `📋 Conversation Summary (${formatDate(
    minDate
  )} - ${formatDate(maxDate)})\n\n`;
  const content =
    "**Key Points:**\n" + topPoints.map((point) => `• ${point}`).join("\n");
  const footer = `\n\n📊 Based on ${sources.length} message${
    sources.length > 1 ? "s" : ""
  }`;

  return header + content + footer;
}
