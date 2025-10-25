/**
 * Decision Extractor
 * Rule-based extraction of decisions from conversation messages
 * PR 6: Template-first approach with optional LLM enhancement
 */

import {
  firebaseFirestore,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  doc,
  setDoc,
  where,
} from "../../lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Insight } from "../../types/casper";
import { Message } from "../../features/messages/api";

// Cache key for decisions
const CACHE_KEY_PREFIX = "casper:decisions:";

// Decision cue patterns (case-insensitive)
const DECISION_PATTERNS = [
  // Agreement patterns - capture more context
  /\b(We agreed|We've agreed|We decided|We've decided|We're going with|We'll go with)\s+(?:to\s+)?([^.!?]+)/gi,
  // Consensus patterns - capture more context
  /\b(Final decision|Final choice|Chosen|Selected|Decided on|Going with)\s*:?\s*(?:to\s+)?([^.!?]+)/gi,
  // Commitment patterns - capture more context
  /\b(Let's go with|Let's use|Let's do|We're doing|We're using)\s+(?:to\s+)?([^.!?]+)/gi,
  // Confirmation patterns
  /\b(Confirmed|Approved|Finalized|Settled on|Locked in)\s*:?\s*(?:to\s+)?([^.!?]+)/gi,
  // Resolution patterns
  /\b(Resolved to|Resolution is|Conclusion is|The plan is)\s+(?:to\s+)?([^.!?]+)/gi,
  // Flexible "final" patterns (handles typos like "finals")
  /\b(Final[s]?\s+decision[s]?)\s*:?\s*(?:to\s+)?([^.!?]+)/gi,
  // Should/Will patterns for decisions
  /\b(We should|We'll|We will|We need to|We're going to)\s+([^.!?]+)/gi,
  // Yes/Agreement patterns
  /\b(Yes,?\s+(?:we\s+)?(?:should|will|can|need to)|Absolutely!?\s+(?:we\s+)?(?:should|will|can|need to))\s*([^.!?]+)/gi,
  // Perfect/Great with decisions
  /\b(Perfect!?\s+(?:we\s+)?(?:should|will|can|need to)|Great!?\s+(?:we\s+)?(?:should|will|can|need to))\s*([^.!?]+)/gi,
  // Schedule/Plan decisions
  /\b(Let's schedule|We'll schedule|Schedule for|Demo for|Meeting for)\s+([^.!?]+)/gi,
];

// Patterns to exclude (tentative or questioning)
const EXCLUSION_PATTERNS = [
  /\b(Should we|Could we|What if|Maybe|Perhaps|Possibly|Might)\b/i,
  /\b(I think|I believe|I feel|In my opinion)\b/i,
  /\?$/,
];

export interface ExtractedDecision {
  content: string;
  mid: string; // message id
  timestamp: number;
  senderId: string;
  confidence: number; // 0-1 score
}

/**
 * Extract decisions from a single message
 */
function extractDecisionsFromMessage(message: Message): ExtractedDecision[] {
  if (!message.text || message.text.trim().length < 10) {
    return [];
  }

  const decisions: ExtractedDecision[] = [];
  const text = message.text;

  // Debug logging
  // console.log("Checking message for decisions:", text);

  // Check exclusion patterns first
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(text)) {
      // console.log("Message excluded by pattern:", pattern.source);
      return []; // Skip messages that are tentative or questions
    }
  }

  // Check for decision patterns
  for (const pattern of DECISION_PATTERNS) {
    const matches = [...text.matchAll(pattern)];

    for (const match of matches) {
      const fullMatch = match[0];
      const decisionText = match[2] || match[1];

      if (!decisionText || decisionText.trim().length < 5) {
        continue;
      }

      // console.log("Found decision match:", fullMatch, "->", decisionText);

      // Clean up the decision text
      let content = decisionText.trim();

      // Improve marker extraction for better readability
      const words = fullMatch.split(/\s+/);
      let marker = words[0];

      // For multi-word markers, include more context for better readability
      if (words.length >= 2) {
        const firstTwo = `${words[0]} ${words[1]}`.toLowerCase();
        if (firstTwo === "we agreed") {
          marker = "We agreed";
        } else if (firstTwo === "we decided") {
          marker = "We decided";
        } else if (
          firstTwo === "final decision" ||
          firstTwo === "finals decision"
        ) {
          marker = "Final decision";
        } else if (firstTwo === "let's go") {
          marker = "Let's go with";
        } else if (firstTwo === "we're going") {
          marker = "We're going with";
        } else if (firstTwo === "we're doing") {
          marker = "We're doing";
        } else if (firstTwo === "we're using") {
          marker = "We're using";
        } else if (firstTwo === "we should") {
          marker = "We should";
        } else if (firstTwo === "we'll") {
          marker = "We'll";
        } else if (firstTwo === "we will") {
          marker = "We will";
        } else if (firstTwo === "we need") {
          marker = "We need to";
        } else if (firstTwo === "let's schedule") {
          marker = "Let's schedule";
        } else if (firstTwo === "we'll schedule") {
          marker = "We'll schedule";
        } else if (words.length >= 3) {
          const firstThree =
            `${words[0]} ${words[1]} ${words[2]}`.toLowerCase();
          if (firstThree === "yes, we should") {
            marker = "Yes, we should";
          } else if (firstThree === "absolutely! we should") {
            marker = "Absolutely, we should";
          } else if (firstThree === "perfect! we should") {
            marker = "Perfect, we should";
          } else if (firstThree === "great! we should") {
            marker = "Great, we should";
          }
        } else if (words[0].toLowerCase() === "confirmed") {
          marker = "Confirmed";
        } else if (words[0].toLowerCase() === "approved") {
          marker = "Approved";
        } else if (words[0].toLowerCase() === "finalized") {
          marker = "Finalized";
        } else if (words[0].toLowerCase() === "locked") {
          marker = "Locked in";
        }
      }

      // Format the content more naturally
      if (content.toLowerCase().startsWith("to ")) {
        // Remove "to" prefix for better readability
        content = content.substring(3);
      }

      // Capitalize first letter
      content = content.charAt(0).toUpperCase() + content.slice(1);

      // Add proper punctuation if missing
      if (!content.match(/[.!?]$/)) {
        content += ".";
      }

      // Create the final formatted decision
      content = `${marker}: ${content}`;

      // Limit length
      if (content.length > 300) {
        content = content.substring(0, 297) + "...";
      }

      // Calculate confidence score based on pattern strength
      let confidence = 0.6; // Default confidence above threshold

      if (
        /\b(Final decision|Confirmed|Approved|Finalized|Locked in)\b/i.test(
          fullMatch
        )
      ) {
        confidence = 0.95;
      } else if (/\b(Final[s]?\s+decision[s]?)\b/i.test(fullMatch)) {
        confidence = 0.9; // High confidence for "final decision" patterns (including typos)
      } else if (/\b(We agreed|We decided|Resolved to)\b/i.test(fullMatch)) {
        confidence = 0.85;
      } else if (/\b(Let's go with|We're going with)\b/i.test(fullMatch)) {
        confidence = 0.75;
      } else if (/\b(We should|We'll|We will|We need to)\b/i.test(fullMatch)) {
        confidence = 0.7; // Good confidence for "We should" patterns
      } else if (
        /\b(Let's schedule|We'll schedule|Schedule for|Demo for|Meeting for)\b/i.test(
          fullMatch
        )
      ) {
        confidence = 0.8; // High confidence for scheduling decisions
      } else if (
        /\b(Yes,?\s+(?:we\s+)?(?:should|will|can|need to)|Absolutely!?\s+(?:we\s+)?(?:should|will|can|need to)|Perfect!?\s+(?:we\s+)?(?:should|will|can|need to)|Great!?\s+(?:we\s+)?(?:should|will|can|need to))\b/i.test(
          fullMatch
        )
      ) {
        confidence = 0.75; // Good confidence for agreement patterns
      }

      // console.log("Extracted decision:", content, "confidence:", confidence);

      decisions.push({
        content,
        mid: message.id,
        timestamp: message.timestamp.getTime(),
        senderId: message.senderId,
        confidence,
      });
    }
  }

  return decisions;
}

/**
 * Deduplicate decisions based on similarity
 */
function deduplicateDecisions(
  decisions: ExtractedDecision[]
): ExtractedDecision[] {
  const unique: ExtractedDecision[] = [];

  for (const decision of decisions) {
    // Check if we already have a very similar decision
    const isDuplicate = unique.some((existing) => {
      // Check if contents are very similar
      const similarity = stringSimilarity(
        existing.content.toLowerCase(),
        decision.content.toLowerCase()
      );
      return similarity > 0.7;
    });

    if (!isDuplicate) {
      unique.push(decision);
    }
  }

  return unique;
}

/**
 * Simple string similarity metric (Jaccard-based for decisions)
 */
function stringSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) {
    return 0;
  }

  return intersection.size / union.size;
}

/**
 * Get messages from a conversation
 */
async function getConversationMessages(
  cid: string,
  maxMessages: number = 200
): Promise<Message[]> {
  const messagesRef = collection(
    firebaseFirestore,
    "conversations",
    cid,
    "messages"
  );

  const q = query(
    messagesRef,
    orderBy("timestamp", "desc"),
    limit(maxMessages)
  );

  const snapshot = await getDocs(q);

  const messages: Message[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    const timestampRaw = data.timestamp as Timestamp;
    const timestamp = timestampRaw?.toDate?.() || new Date();

    return {
      id: doc.id,
      senderId: data.senderId,
      type: data.type || "text",
      text: data.text,
      image: data.image,
      timestamp,
      status: data.status || "sent",
    };
  });

  // Return oldest first
  return messages.reverse();
}

/**
 * Generate cache key for decisions
 */
function getCacheKey(cid: string): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${CACHE_KEY_PREFIX}${cid}:${today}`;
}

/**
 * Load decisions from cache
 */
async function loadFromCache(cid: string): Promise<ExtractedDecision[] | null> {
  try {
    const cacheKey = getCacheKey(cid);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Error loading decisions from cache:", error);
  }
  return null;
}

/**
 * Save decisions to cache
 */
async function saveToCache(
  cid: string,
  decisions: ExtractedDecision[]
): Promise<void> {
  try {
    const cacheKey = getCacheKey(cid);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(decisions));
  } catch (error) {
    console.warn("Error saving decisions to cache:", error);
  }
}

/**
 * Extract decisions from a conversation
 * @param cid Conversation ID
 * @param forceRefresh Skip cache and regenerate
 * @returns Array of extracted decisions
 */
export async function extractDecisions(
  cid: string,
  forceRefresh: boolean = false
): Promise<ExtractedDecision[]> {
  // console.log(
  //   "Extracting decisions for conversation:",
  //   cid,
  //   "forceRefresh:",
  //   forceRefresh
  // );

  // Try cache first (if not forcing refresh)
  if (!forceRefresh) {
    const cached = await loadFromCache(cid);
    if (cached) {
      // console.log("Returning cached decisions:", cached.length);
      return cached;
    }
  }

  // Fetch messages
  // console.log("Fetching messages for conversation:", cid);
  const messages = await getConversationMessages(cid);
  // console.log("Found messages:", messages.length);

  // Extract decisions from all messages
  const allDecisions: ExtractedDecision[] = [];
  for (const message of messages) {
    const decisions = extractDecisionsFromMessage(message);
    allDecisions.push(...decisions);
  }

  // console.log("Total decisions extracted:", allDecisions.length);

  // Sort by confidence (highest first), then by timestamp (newest first)
  allDecisions.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 0.05) {
      return b.confidence - a.confidence;
    }
    return b.timestamp - a.timestamp;
  });

  // Deduplicate
  const uniqueDecisions = deduplicateDecisions(allDecisions);
  // console.log("Unique decisions after deduplication:", uniqueDecisions.length);

  // Filter by confidence threshold (only keep decisions with confidence > 0.5)
  const filteredDecisions = uniqueDecisions.filter(
    (decision) => decision.confidence > 0.5
  );
  // console.log(
  //   "Decisions after confidence filter (>0.5):",
  //   filteredDecisions.length
  // );

  // Save to cache
  await saveToCache(cid, filteredDecisions);

  return filteredDecisions;
}

/**
 * Extract decisions from all user conversations (global scope)
 * @param uid User ID
 * @param forceRefresh Skip cache and regenerate
 * @returns Array of extracted decisions from all conversations
 */
export async function extractDecisionsGlobal(
  uid: string,
  forceRefresh: boolean = false
): Promise<ExtractedDecision[]> {
  // Try cache first (if not forcing refresh)
  const globalCacheKey = `${CACHE_KEY_PREFIX}global:${uid}`;
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(globalCacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("Error loading global decisions from cache:", error);
    }
  }

  try {
    // Get all conversations for the user
    const conversationsRef = collection(firebaseFirestore, "conversations");
    const conversationsQuery = query(
      conversationsRef,
      where("members", "array-contains", uid),
      orderBy("updatedAt", "desc"),
      limit(50) // Limit to recent conversations for performance
    );

    const conversationsSnap = await getDocs(conversationsQuery);
    const allDecisions: ExtractedDecision[] = [];

    // Extract decisions from each conversation
    for (const conversationDoc of conversationsSnap.docs) {
      const conversationId = conversationDoc.id;
      try {
        const conversationDecisions = await extractDecisions(
          conversationId,
          forceRefresh
        );
        allDecisions.push(...conversationDecisions);
      } catch (error) {
        console.warn(
          `Error extracting decisions from conversation ${conversationId}:`,
          error
        );
        // Continue with other conversations
      }
    }

    // Sort by confidence (highest first), then by timestamp (newest first)
    allDecisions.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.05) {
        return b.confidence - a.confidence;
      }
      return b.timestamp - a.timestamp;
    });

    // Deduplicate
    const uniqueDecisions = deduplicateDecisions(allDecisions);

    // Filter by confidence threshold (only keep decisions with confidence > 0.5)
    const filteredDecisions = uniqueDecisions.filter(
      (decision) => decision.confidence > 0.5
    );

    // Save to cache
    try {
      await AsyncStorage.setItem(
        globalCacheKey,
        JSON.stringify(filteredDecisions)
      );
    } catch (error) {
      console.warn("Error saving global decisions to cache:", error);
    }

    return filteredDecisions;
  } catch (error) {
    console.error("Error extracting global decisions:", error);
    throw error;
  }
}

/**
 * Save decision to Firestore as an Insight
 * @param decision Extracted decision
 * @param cid Conversation ID
 * @param uid User ID who is saving it
 */
export async function saveDecisionAsInsight(
  decision: ExtractedDecision,
  cid: string,
  uid: string
): Promise<string> {
  const insightId = `decision_${decision.mid}_${Date.now()}`;
  const insightRef = doc(
    firebaseFirestore,
    "assist",
    "insights",
    cid,
    insightId
  );

  const insight: Omit<Insight, "id"> = {
    cid,
    type: "decisions",
    window: null,
    content: decision.content,
    createdBy: uid,
    createdAt: Timestamp.fromMillis(Date.now()),
  };

  await setDoc(insightRef, insight);

  return insightId;
}

/**
 * Clear decisions cache for a conversation
 */
export async function clearDecisionsCache(cid: string): Promise<void> {
  try {
    const cacheKey = getCacheKey(cid);
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn("Error clearing decisions cache:", error);
  }
}
