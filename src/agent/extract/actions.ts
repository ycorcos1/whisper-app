/**
 * Action Item Extractor
 * Rule-based extraction of action items from conversation messages
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
import { Task } from "../../types/casper";
import { Message } from "../../features/messages/api";

// Cache key for action items
const CACHE_KEY_PREFIX = "casper:actions:";

// Action cue patterns (case-insensitive)
const ACTION_PATTERNS = [
  // Imperative statements
  /\b(I will|I'll|I'm going to|I need to|I should|I have to|I must)\s+([^.!?]+)/gi,
  // Requests
  /\b(Can you|Could you|Would you|Please|Will you)\s+([^.!?]+)/gi,
  // Collaborative suggestions
  /\b(Let's|Let us|We should|We need to|We have to|We must)\s+([^.!?]+)/gi,
  // Time-bound tasks
  /\b(by|before|until)\s+(EOD|end of day|today|tomorrow|this week|next week|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi,
  // Direct assignments
  /\b(assigned to|assign to|owned by|@[\w]+)\s+([^.!?]+)/gi,
  // Task markers
  /\b(TODO|TO-DO|TASK|ACTION|FIXME):\s*([^.!?]+)/gi,
  // Promise/commitment patterns
  /\b(I can|I'll have|I'll create|I'll prepare|I'll add|I'll implement|I'll send)\s+([^.!?]+)/gi,
  // Assignment patterns
  /\b([A-Z][a-z]+),?\s+(?:can you|will you|please)\s+([^.!?]+)/gi,
  // Timeline commitments
  /\b(ready by|deliver by|finish by|complete by)\s+([^.!?]+)/gi,
];

// Patterns to exclude (not real actions)
const EXCLUSION_PATTERNS = [
  /\b(I think|I believe|I feel|Maybe|Perhaps|Probably|Possibly)\b/i,
  /\b(What if|How about|Should we|Could we)\b/i,
  /^(Hi|Hey|Hello|Thanks|Thank you)\b/i,
];

export interface ExtractedAction {
  title: string;
  mid: string; // message id
  timestamp: number;
  senderId: string;
  assignee?: string;
  due?: string;
  confidence: number; // 0-1 score
}

/**
 * Extract action items from a single message
 */
function extractActionsFromMessage(message: Message): ExtractedAction[] {
  if (!message.text || message.text.trim().length < 5) {
    return [];
  }

  // console.log("Checking message for actions:", message.text);

  const actions: ExtractedAction[] = [];
  const text = message.text;

  // Check exclusion patterns first
  for (const pattern of EXCLUSION_PATTERNS) {
    if (pattern.test(text)) {
      // console.log("Message excluded by pattern:", pattern.source);
      return []; // Skip messages that are clearly not actionable
    }
  }

  // Check for action patterns
  for (const pattern of ACTION_PATTERNS) {
    const matches = [...text.matchAll(pattern)];

    for (const match of matches) {
      const fullMatch = match[0];
      const actionText = match[2] || match[1];

      // console.log("Found action match:", fullMatch, "->", actionText);

      if (!actionText || actionText.trim().length < 5) {
        continue;
      }

      // Clean up the action text
      let title = actionText.trim();

      // Remove trailing punctuation except periods in abbreviations
      title = title.replace(/[,;!?]+$/, "");

      // Limit length
      if (title.length > 200) {
        title = title.substring(0, 197) + "...";
      }

      // Extract assignee (if mentioned)
      let assignee: string | undefined;
      const assigneeMatch = title.match(/@([\w]+)/);
      if (assigneeMatch) {
        assignee = assigneeMatch[1];
      }

      // Extract due date (if mentioned)
      let due: string | undefined;
      const dueMatch = text.match(
        /\b(by|before|until)\s+(EOD|end of day|today|tomorrow|this week|next week|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi
      );
      if (dueMatch) {
        due = dueMatch[0].replace(/^(by|before|until)\s+/i, "");
      }

      // Calculate confidence score based on pattern strength
      let confidence = 0.5;
      if (/\b(I will|I'll|TODO|TASK|ACTION)\b/i.test(fullMatch)) {
        confidence = 0.9;
      } else if (/\b(Let's|We should|by EOD|by today)\b/i.test(fullMatch)) {
        confidence = 0.8;
      } else if (/\b(Can you|Could you|Please)\b/i.test(fullMatch)) {
        confidence = 0.7;
      }

      actions.push({
        title,
        mid: message.id,
        timestamp: message.timestamp.getTime(),
        senderId: message.senderId,
        assignee,
        due,
        confidence,
      });
    }
  }

  return actions;
}

/**
 * Deduplicate action items based on similarity
 */
function deduplicateActions(actions: ExtractedAction[]): ExtractedAction[] {
  const unique: ExtractedAction[] = [];

  for (const action of actions) {
    // Check if we already have a very similar action
    const isDuplicate = unique.some((existing) => {
      // Same message ID
      if (existing.mid === action.mid) {
        // Check if titles are very similar (basic string similarity)
        const similarity = stringSimilarity(
          existing.title.toLowerCase(),
          action.title.toLowerCase()
        );
        return similarity > 0.8;
      }
      return false;
    });

    if (!isDuplicate) {
      unique.push(action);
    }
  }

  return unique;
}

/**
 * Simple string similarity metric (Levenshtein-based)
 */
function stringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
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
 * Generate cache key for actions
 */
function getCacheKey(cid: string): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${CACHE_KEY_PREFIX}${cid}:${today}`;
}

/**
 * Load actions from cache
 */
async function loadFromCache(cid: string): Promise<ExtractedAction[] | null> {
  try {
    const cacheKey = getCacheKey(cid);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Error loading actions from cache:", error);
  }
  return null;
}

/**
 * Save actions to cache
 */
async function saveToCache(
  cid: string,
  actions: ExtractedAction[]
): Promise<void> {
  try {
    const cacheKey = getCacheKey(cid);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(actions));
  } catch (error) {
    console.warn("Error saving actions to cache:", error);
  }
}

/**
 * Extract action items from a conversation
 * @param cid Conversation ID
 * @param forceRefresh Skip cache and regenerate
 * @returns Array of extracted actions
 */
export async function extractActions(
  cid: string,
  forceRefresh: boolean = false
): Promise<ExtractedAction[]> {
  // console.log(
  //   "Extracting actions for conversation:",
  //   cid,
  //   "forceRefresh:",
  //   forceRefresh
  // );

  // Try cache first (if not forcing refresh)
  if (!forceRefresh) {
    const cached = await loadFromCache(cid);
    if (cached) {
      // console.log("Returning cached actions:", cached.length);
      return cached;
    }
  }

  // Fetch messages
  // console.log("Fetching messages for conversation:", cid);
  const messages = await getConversationMessages(cid);
  // console.log("Found messages:", messages.length);

  // Extract actions from all messages
  const allActions: ExtractedAction[] = [];
  for (const message of messages) {
    const actions = extractActionsFromMessage(message);
    allActions.push(...actions);
  }

  // console.log("Total actions extracted:", allActions.length);

  // Sort by confidence (highest first), then by timestamp (newest first)
  allActions.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return b.confidence - a.confidence;
    }
    return b.timestamp - a.timestamp;
  });

  // Deduplicate
  const uniqueActions = deduplicateActions(allActions);

  // Filter by confidence threshold (only keep actions with confidence > 0.5)
  const filteredActions = uniqueActions.filter(
    (action) => action.confidence > 0.5
  );

  // Save to cache
  await saveToCache(cid, filteredActions);

  return filteredActions;
}

/**
 * Extract action items from all user conversations (global scope)
 * @param uid User ID
 * @param forceRefresh Skip cache and regenerate
 * @returns Array of extracted actions from all conversations
 */
export async function extractActionsGlobal(
  uid: string,
  forceRefresh: boolean = false
): Promise<ExtractedAction[]> {
  // Try cache first (if not forcing refresh)
  const globalCacheKey = `${CACHE_KEY_PREFIX}global:${uid}`;
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(globalCacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("Error loading global actions from cache:", error);
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
    const allActions: ExtractedAction[] = [];

    // Extract actions from each conversation
    for (const conversationDoc of conversationsSnap.docs) {
      const conversationId = conversationDoc.id;
      try {
        const conversationActions = await extractActions(
          conversationId,
          forceRefresh
        );
        allActions.push(...conversationActions);
      } catch (error) {
        console.warn(
          `Error extracting actions from conversation ${conversationId}:`,
          error
        );
        // Continue with other conversations
      }
    }

    // Sort by confidence (highest first), then by timestamp (newest first)
    allActions.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      return b.timestamp - a.timestamp;
    });

    // Deduplicate
    const uniqueActions = deduplicateActions(allActions);

    // Filter by confidence threshold (only keep actions with confidence > 0.5)
    const filteredActions = uniqueActions.filter(
      (action) => action.confidence > 0.5
    );

    // Save to cache
    try {
      await AsyncStorage.setItem(
        globalCacheKey,
        JSON.stringify(filteredActions)
      );
    } catch (error) {
      console.warn("Error saving global actions to cache:", error);
    }

    return filteredActions;
  } catch (error) {
    console.error("Error extracting global actions:", error);
    throw error;
  }
}

/**
 * Convert extracted action to Task format and save to Firestore
 * @param action Extracted action
 * @param uid User ID to assign task to
 */
export async function saveActionAsTask(
  action: ExtractedAction,
  uid: string
): Promise<string> {
  const taskId = `${action.mid}_${Date.now()}`;
  const taskRef = doc(firebaseFirestore, "assist", "tasks", uid, taskId);

  const task: Omit<Task, "id"> = {
    title: action.title,
    sourceCid: undefined, // Will be set by caller
    sourceMid: action.mid,
    due: action.due,
    status: "open",
    createdAt: Timestamp.fromMillis(Date.now()),
    updatedAt: Timestamp.fromMillis(Date.now()),
  };

  await setDoc(taskRef, task);

  return taskId;
}

/**
 * Clear actions cache for a conversation
 */
export async function clearActionsCache(cid: string): Promise<void> {
  try {
    const cacheKey = getCacheKey(cid);
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn("Error clearing actions cache:", error);
  }
}
