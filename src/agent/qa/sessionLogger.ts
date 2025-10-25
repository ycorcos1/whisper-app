/**
 * Session Logger
 * Local-only logging for Ask tab Q&A sessions
 * Uses AsyncStorage (no Firestore writes)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QASession {
  id: string;
  conversationId: string;
  question: string;
  answer: string;
  mode: "template" | "llm";
  sourceCount: number;
  timestamp: number;
  duration?: number; // milliseconds
}

const STORAGE_KEY = "@casper_qa_sessions";
const MAX_SESSIONS = 100; // Keep last 100 sessions

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `qa_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Load all sessions from AsyncStorage
 */
async function loadSessions(): Promise<QASession[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      return [];
    }
    return JSON.parse(json);
  } catch (error) {
    console.error("Error loading QA sessions:", error);
    return [];
  }
}

/**
 * Save sessions to AsyncStorage
 */
async function saveSessions(sessions: QASession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving QA sessions:", error);
  }
}

/**
 * Log a new Q&A session
 */
export async function logSession(
  conversationId: string,
  question: string,
  answer: string,
  mode: "template" | "llm",
  sourceCount: number,
  duration?: number
): Promise<string> {
  const session: QASession = {
    id: generateSessionId(),
    conversationId,
    question,
    answer,
    mode,
    sourceCount,
    timestamp: Date.now(),
    duration,
  };

  const sessions = await loadSessions();
  sessions.unshift(session); // Add to beginning

  // Trim to max size
  if (sessions.length > MAX_SESSIONS) {
    sessions.splice(MAX_SESSIONS);
  }

  await saveSessions(sessions);
  return session.id;
}

/**
 * Get sessions for a specific conversation
 */
export async function getConversationSessions(
  conversationId: string
): Promise<QASession[]> {
  const sessions = await loadSessions();
  return sessions.filter((s) => s.conversationId === conversationId);
}

/**
 * Get last N sessions for a conversation
 */
export async function getRecentSessions(
  conversationId: string,
  limit: number = 10
): Promise<QASession[]> {
  const sessions = await getConversationSessions(conversationId);
  return sessions.slice(0, limit);
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: string): Promise<QASession | null> {
  const sessions = await loadSessions();
  return sessions.find((s) => s.id === sessionId) || null;
}

/**
 * Clear all sessions
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing QA sessions:", error);
  }
}

/**
 * Clear sessions for a specific conversation
 */
export async function clearConversationSessions(
  conversationId: string
): Promise<void> {
  const sessions = await loadSessions();
  const filtered = sessions.filter((s) => s.conversationId !== conversationId);
  await saveSessions(filtered);
}

/**
 * Get session statistics
 */
export async function getSessionStats(): Promise<{
  total: number;
  templateCount: number;
  llmCount: number;
  avgDuration: number;
}> {
  const sessions = await loadSessions();

  const templateCount = sessions.filter((s) => s.mode === "template").length;
  const llmCount = sessions.filter((s) => s.mode === "llm").length;

  const durationsWithValue = sessions
    .filter((s) => s.duration !== undefined)
    .map((s) => s.duration!);

  const avgDuration =
    durationsWithValue.length > 0
      ? durationsWithValue.reduce((a, b) => a + b, 0) /
        durationsWithValue.length
      : 0;

  return {
    total: sessions.length,
    templateCount,
    llmCount,
    avgDuration,
  };
}
