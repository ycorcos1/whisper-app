/**
 * Casper API Service
 * Client-side wrapper for Casper RAG Firebase Functions
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "../lib/firebase";

const functions = getFunctions(firebaseApp);

export interface SearchResult {
  id: string;
  score: number;
  metadata: {
    cid: string;
    mid: string;
    text: string;
    createdAt: number;
  };
}

export interface AnswerResult {
  success: boolean;
  answer: string;
  sources: SearchResult[];
  mode: "template" | "llm";
}

export interface SummaryResult {
  success: boolean;
  summary: string;
  mode: "template" | "llm";
}

/**
 * Search for relevant messages using vector similarity
 * @param query Search query
 * @param conversationId Conversation ID to search in
 * @param topK Number of results to return
 */
export async function searchVectors(
  query: string,
  conversationId?: string,
  topK: number = 8
): Promise<SearchResult[]> {
  const casperSearch = httpsCallable(functions, "casperSearch");

  try {
    const result = await casperSearch({
      query,
      conversationId,
      topK,
    });

    const data = result.data as { success: boolean; results: SearchResult[] };

    if (!data.success) {
      throw new Error("Search failed");
    }

    return data.results;
  } catch (error) {
    console.error("Error searching vectors:", error);
    throw new Error(
      `Failed to search: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Answer a question using RAG
 * @param question User's question
 * @param conversationId Conversation ID
 * @param topK Number of sources to retrieve
 * @param useLLM Whether to use LLM (true) or template mode (false)
 */
export async function answerQuestion(
  question: string,
  conversationId: string,
  topK: number = 8,
  useLLM: boolean = false
): Promise<AnswerResult> {
  const casperAnswer = httpsCallable(functions, "casperAnswer");

  try {
    const result = await casperAnswer({
      question,
      conversationId,
      topK,
      useLLM,
    });

    const data = result.data as AnswerResult;

    if (!data.success) {
      throw new Error("Answer generation failed");
    }

    return data;
  } catch (error) {
    console.error("Error answering question:", error);
    throw new Error(
      `Failed to answer: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate a summary of a conversation
 * @param conversationId Conversation ID to summarize
 * @param focusQuery Optional query to focus the summary on
 * @param length Summary length preference
 * @param useLLM Whether to use LLM (true) or template mode (false)
 */
export async function summarizeConversation(
  conversationId: string,
  focusQuery?: string,
  length: "short" | "normal" | "long" = "normal",
  useLLM: boolean = false
): Promise<SummaryResult> {
  const casperSummarize = httpsCallable(functions, "casperSummarize");

  try {
    const result = await casperSummarize({
      conversationId,
      focusQuery,
      length,
      useLLM,
    });

    const data = result.data as SummaryResult;

    if (!data.success) {
      throw new Error("Summary generation failed");
    }

    return data;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error(
      `Failed to generate summary: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
