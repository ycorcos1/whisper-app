/**
 * Priority Detection Module
 * Detects urgent and high-priority messages based on keywords, patterns, and context
 */

export interface PriorityLevel {
  level: "urgent" | "high" | "normal";
  score: number;
  reasons: string[];
}

/**
 * Detect priority level of a message based on content analysis
 * @param messageText The message text to analyze
 * @returns Priority level with score and reasons
 */
export function detectPriority(messageText: string): PriorityLevel {
  if (!messageText || messageText.trim().length === 0) {
    return { level: "normal", score: 0, reasons: [] };
  }

  const text = messageText.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // 1. URGENT KEYWORDS (highest weight: 10 points each)
  const urgentKeywords = [
    "urgent",
    "emergency",
    "critical",
    "asap",
    "immediately",
    "right now",
    "emergency",
    "911",
  ];

  urgentKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 10;
      reasons.push(`Contains "${keyword}"`);
    }
  });

  // 2. IMPORTANT KEYWORDS (medium weight: 5 points each)
  const importantKeywords = [
    "important",
    "priority",
    "deadline",
    "must",
    "need",
    "required",
    "crucial",
    "vital",
  ];

  importantKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 5;
      reasons.push(`Contains "${keyword}"`);
    }
  });

  // 3. TIME-SENSITIVE PHRASES (high weight: 7 points each)
  const timePhrases = [
    "by eod",
    "end of day",
    "by tomorrow",
    "by today",
    "this morning",
    "this afternoon",
    "this evening",
    "in 5 minutes",
    "in 10 minutes",
    "in an hour",
    "within an hour",
  ];

  timePhrases.forEach((phrase) => {
    if (text.includes(phrase)) {
      score += 7;
      reasons.push(`Time-sensitive: "${phrase}"`);
    }
  });

  // 4. EXCLAMATION MARKS (2 points per mark, capped at 10)
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 2) {
    const points = Math.min(exclamationCount * 2, 10);
    score += points;
    reasons.push(
      `${exclamationCount} exclamation mark${exclamationCount > 1 ? "s" : ""}`
    );
  }

  // 5. ALL CAPS (8 points if significant portion is caps)
  const capsLetters = (messageText.match(/[A-Z]/g) || []).length;
  const totalLetters = (messageText.match(/[a-zA-Z]/g) || []).length;
  const capsRatio = totalLetters > 0 ? capsLetters / totalLetters : 0;

  if (capsRatio > 0.5 && totalLetters > 10) {
    score += 8;
    reasons.push("Mostly uppercase");
  }

  // 6. URGENT QUESTIONS (3 points)
  const urgentQuestionWords = ["when", "where", "who", "asap"];
  const hasQuestion = text.includes("?");
  const hasUrgentWord = urgentQuestionWords.some((word) => text.includes(word));

  if (hasQuestion && hasUrgentWord) {
    score += 3;
    reasons.push("Urgent question");
  }

  // 7. NEGATIVE/PROBLEM INDICATORS (6 points)
  const problemKeywords = [
    "broken",
    "error",
    "failed",
    "failing",
    "down",
    "issue",
    "problem",
    "blocked",
    "blocker",
    "stuck",
  ];

  problemKeywords.forEach((keyword) => {
    if (text.includes(keyword)) {
      score += 6;
      reasons.push(`Problem indicator: "${keyword}"`);
      return; // Only count first match to avoid double-counting
    }
  });

  // 8. ACTION REQUIRED PHRASES (5 points)
  const actionPhrases = [
    "need you to",
    "can you",
    "please",
    "could you",
    "would you",
    "action required",
    "action needed",
  ];

  actionPhrases.forEach((phrase) => {
    if (text.includes(phrase)) {
      score += 5;
      reasons.push(`Action required: "${phrase}"`);
      return; // Only count first match
    }
  });

  // Determine priority level based on score
  let level: "urgent" | "high" | "normal" = "normal";

  if (score >= 10) {
    level = "urgent";
  } else if (score >= 5) {
    level = "high";
  }

  return { level, score, reasons };
}

/**
 * Check if a message should be shown in priority view
 * @param messageText The message text to check
 * @returns true if message is high priority or urgent
 */
export function isPriorityMessage(messageText: string): boolean {
  const { level } = detectPriority(messageText);
  return level === "urgent" || level === "high";
}

/**
 * Get priority badge text for UI
 * @param level Priority level
 * @returns Badge text with emoji
 */
export function getPriorityBadge(level: "urgent" | "high" | "normal"): string {
  switch (level) {
    case "urgent":
      return "🔴 URGENT";
    case "high":
      return "⚠️ HIGH";
    case "normal":
      return "";
  }
}

/**
 * Get priority color for UI
 * @param level Priority level
 * @returns Color string
 */
export function getPriorityColor(level: "urgent" | "high" | "normal"): string {
  switch (level) {
    case "urgent":
      return "#FF4444"; // Red
    case "high":
      return "#FFA500"; // Orange
    case "normal":
      return "#888888"; // Gray
  }
}
