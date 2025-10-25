/**
 * Conversation Summary Generator
 * Generates quick summaries for the open conversation
 * Supports template and LLM modes
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { summarizeConversation as apiSummarize } from "../../services/casperApi";
import { featureFlags } from "../../state/featureFlags";

export interface ConversationSummary {
  cid: string;
  content: string;
  mode: "template" | "llm";
  length: "short" | "normal" | "long";
  createdAt: number;
  day: string; // YYYY-MM-DD format
}

// Cache key for AsyncStorage
const CACHE_KEY = (cid: string, day: string) => `casper:summary:${cid}:${day}`;

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Load summary from cache
 */
export async function loadSummaryFromCache(
  cid: string,
  day?: string
): Promise<ConversationSummary | null> {
  try {
    const dayStr = day || getTodayString();
    const cached = await AsyncStorage.getItem(CACHE_KEY(cid, dayStr));
    if (cached) {
      return JSON.parse(cached) as ConversationSummary;
    }
  } catch (error) {
    console.warn("Error loading summary from cache:", error);
  }
  return null;
}

/**
 * Save summary to cache
 */
export async function saveSummaryToCache(
  summary: ConversationSummary
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY(summary.cid, summary.day),
      JSON.stringify(summary)
    );
  } catch (error) {
    console.warn("Error saving summary to cache:", error);
  }
}

/**
 * Generate a conversation summary
 * @param cid Conversation ID
 * @param focusQuery Optional query to focus the summary on (e.g., "last 24h", "last 7d")
 * @param length Summary length preference
 * @param forceRefresh Skip cache and generate new summary
 */
export async function generateConversationSummary(
  cid: string,
  focusQuery?: string,
  length: "short" | "normal" | "long" = "normal",
  forceRefresh: boolean = false
): Promise<ConversationSummary> {
  const today = getTodayString();

  // Try to load from cache first
  if (!forceRefresh) {
    const cached = await loadSummaryFromCache(cid, today);
    if (cached && cached.length === length) {
      return cached;
    }
  }

  // Generate new summary
  const useLLM = featureFlags.CASPER_ENABLE_LLM;

  try {
    const result = await apiSummarize(cid, focusQuery, length, useLLM);

    const summary: ConversationSummary = {
      cid,
      content: result.summary,
      mode: result.mode,
      length,
      createdAt: Date.now(),
      day: today,
    };

    // Save to cache
    await saveSummaryToCache(summary);

    return summary;
  } catch (error) {
    console.error("Error generating conversation summary:", error);
    throw error;
  }
}

/**
 * Clear cached summaries for a conversation
 */
export async function clearSummaryCache(cid: string): Promise<void> {
  try {
    // Clear today's cache
    const today = getTodayString();
    await AsyncStorage.removeItem(CACHE_KEY(cid, today));
  } catch (error) {
    console.warn("Error clearing summary cache:", error);
  }
}
