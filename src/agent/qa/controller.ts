/**
 * QA Controller
 * Handles question answering with two modes:
 * 1. Template-based (default, no LLM) - Fast, no cost
 * 2. LLM-based (optional, env-gated) - Natural language, requires API key
 */

import {
  searchVectors,
  answerQuestion as apiAnswerQuestion,
  SearchResult,
} from "../../services/casperApi";
import { featureFlags } from "../../state/featureFlags";

export interface QAAnswer {
  answer: string;
  sources: SearchResult[];
  mode: "template" | "llm";
  timestamp: number;
}

/**
 * Format sources as numbered citations
 */
function formatSourcesCitation(sources: SearchResult[]): string {
  if (sources.length === 0) {
    return "";
  }

  return sources
    .map((source) => {
      const date = new Date(source.metadata.createdAt);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${sources.indexOf(source) + 1}] ${dateStr} ${timeStr}`;
    })
    .join("\n");
}

/**
 * Extract key sentences from search results
 */
function extractKeySentences(
  sources: SearchResult[],
  maxSentences: number = 5
): string[] {
  const sentences: string[] = [];

  for (const source of sources) {
    const text = source.metadata.text;
    // Split by sentence boundaries
    const sourceSentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20); // Filter out very short fragments

    sentences.push(...sourceSentences);

    if (sentences.length >= maxSentences) {
      break;
    }
  }

  return sentences.slice(0, maxSentences);
}

/**
 * Template-based answer generator
 * Fast, offline, no LLM required
 */
async function generateTemplateAnswer(
  query: string,
  sources: SearchResult[]
): Promise<string> {
  if (sources.length === 0) {
    return `I couldn't find any relevant messages to answer: "${query}"\n\nTry asking about topics that were discussed in this conversation.`;
  }

  // Extract key sentences from top results
  const keySentences = extractKeySentences(sources, 5);

  // Build template response
  const intro = `Based on ${sources.length} relevant message${
    sources.length > 1 ? "s" : ""
  }, here's what I found:\n\n`;

  const content = keySentences.map((sentence) => `• ${sentence}`).join("\n\n");

  const citation = `\n\n📎 Sources:\n${formatSourcesCitation(sources)}`;

  return intro + content + citation;
}

/**
 * LLM-based answer generator
 * Requires CASPER_ENABLE_LLM=true and valid OpenAI API key
 * Calls Firebase Function to handle LLM generation
 */
async function generateLLMAnswer(
  query: string,
  conversationId: string,
  sources: SearchResult[]
): Promise<string> {
  // Call Firebase Function with LLM enabled
  const result = await apiAnswerQuestion(
    query,
    conversationId,
    sources.length,
    true
  );
  return result.answer;
}

// Active query tracking for cancellation
const activeQueries = new Map<string, AbortController>();

/**
 * Main controller: Answer a question about the conversation
 * @param query User's question
 * @param conversationId Conversation ID to search in
 * @param topK Number of sources to retrieve (default: 8)
 * @param queryId Optional query ID for cancellation tracking
 * @returns Answer with sources and metadata
 */
export async function answerQuery(
  query: string,
  conversationId: string,
  topK: number = 8,
  queryId?: string
): Promise<QAAnswer> {
  if (!query.trim()) {
    throw new Error("Question cannot be empty");
  }

  // Create abort controller for this query
  const abortController = new AbortController();
  const currentQueryId = queryId || `query_${Date.now()}`;

  // Track active query
  activeQueries.set(currentQueryId, abortController);

  try {
    // Check if already cancelled
    if (abortController.signal.aborted) {
      throw new Error("Query was cancelled");
    }

    // Step 1: Retrieve relevant sources
    const sources = await searchVectors(query, conversationId, topK);

    // Check cancellation again
    if (abortController.signal.aborted) {
      throw new Error("Query was cancelled");
    }

    // Step 2: Determine mode
    const useLLM = featureFlags.CASPER_ENABLE_LLM;
    const mode: "template" | "llm" = useLLM ? "llm" : "template";

    // Step 3: Generate answer based on mode
    let answer: string;

    try {
      if (useLLM) {
        // Call Firebase Function for LLM answer
        answer = await generateLLMAnswer(query, conversationId, sources);
      } else {
        // Generate template answer locally
        answer = await generateTemplateAnswer(query, sources);
      }
    } catch (error) {
      console.error("Error generating answer:", error);
      // Fallback to template if LLM fails
      if (useLLM) {
        console.warn("LLM failed, falling back to template mode");
        answer = await generateTemplateAnswer(query, sources);
      } else {
        throw error;
      }
    }

    // Final cancellation check
    if (abortController.signal.aborted) {
      throw new Error("Query was cancelled");
    }

    return {
      answer,
      sources,
      mode,
      timestamp: Date.now(),
    };
  } finally {
    // Clean up
    activeQueries.delete(currentQueryId);
  }
}

/**
 * Cancel an in-flight query
 * @param queryId Query ID to cancel
 */
export function cancelQuery(queryId: string): void {
  const controller = activeQueries.get(queryId);
  if (controller) {
    controller.abort();
    activeQueries.delete(queryId);
    // console.log(`Query cancelled: ${queryId}`);
  }
}

/**
 * Cancel all active queries
 */
export function cancelAllQueries(): void {
  for (const [, controller] of activeQueries.entries()) {
    controller.abort();
    // console.log(`Query cancelled: ${queryId}`);
  }
  activeQueries.clear();
}

/**
 * Validate query before execution
 */
export function validateQuery(query: string): {
  valid: boolean;
  error?: string;
} {
  if (!query.trim()) {
    return { valid: false, error: "Question cannot be empty" };
  }

  if (query.length > 500) {
    return { valid: false, error: "Question is too long (max 500 characters)" };
  }

  if (query.length < 3) {
    return { valid: false, error: "Question is too short (min 3 characters)" };
  }

  return { valid: true };
}
