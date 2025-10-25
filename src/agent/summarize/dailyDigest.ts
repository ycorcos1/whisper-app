/**
 * Daily Digest Generator
 * Collects latest messages from all joined conversations
 * Creates sections (Today / Yesterday) with compact bullets
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  firebaseFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  getDoc,
  doc,
} from "../../lib/firebase";

export interface DigestConversation {
  cid: string;
  name: string;
  messageCount: number; // For backward compatibility, but we'll show individual messages
  latestMessage: string;
  latestTimestamp: number;
  messageId?: string; // Add message ID for individual messages
  senderId?: string; // Who sent the message
}

export interface DailyDigest {
  uid: string;
  content: string;
  todayConversations: DigestConversation[];
  yesterdayConversations: DigestConversation[];
  createdAt: number;
  day: string; // YYYY-MM-DD format
}

// Cache key for AsyncStorage
const CACHE_KEY = (uid: string, day: string) => `casper:digest:${uid}:${day}`;

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Get date range for today (00:00 to 23:59)
 * Uses local timezone to ensure we capture the full day
 */
function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0 // milliseconds
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999 // milliseconds
  );
  // console.log("[Digest] Today range (local):", {
  //   start: start.toLocaleString(),
  //   end: end.toLocaleString(),
  //   startUTC: start.toISOString(),
  //   endUTC: end.toISOString(),
  // });
  return { start, end };
}

/**
 * Get date range for yesterday (00:00 to 23:59)
 * Uses local timezone to ensure we capture the full day
 */
function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const start = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
    0,
    0,
    0,
    0 // milliseconds
  );
  const end = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
    23,
    59,
    59,
    999 // milliseconds
  );
  // console.log("[Digest] Yesterday range (local):", {
  //   start: start.toLocaleString(),
  //   end: end.toLocaleString(),
  //   startUTC: start.toISOString(),
  //   endUTC: end.toISOString(),
  // });
  return { start, end };
}

/**
 * Load digest from cache
 */
export async function loadDigestFromCache(
  uid: string,
  day?: string
): Promise<DailyDigest | null> {
  try {
    const dayStr = day || getTodayString();
    const cached = await AsyncStorage.getItem(CACHE_KEY(uid, dayStr));
    if (cached) {
      return JSON.parse(cached) as DailyDigest;
    }
  } catch (error) {
    console.warn("Error loading digest from cache:", error);
  }
  return null;
}

/**
 * Save digest to cache
 */
export async function saveDigestToCache(digest: DailyDigest): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY(digest.uid, digest.day),
      JSON.stringify(digest)
    );
  } catch (error) {
    console.warn("Error saving digest to cache:", error);
  }
}

/**
 * Get conversations with messages in a date range
 */
async function getConversationsInRange(
  uid: string,
  startDate: Date,
  endDate: Date
): Promise<DigestConversation[]> {
  try {
    // console.log("[Digest] Fetching conversations for uid:", uid);
    // console.log("[Digest] Date range (UTC):", {
    //   start: startDate.toISOString(),
    //   end: endDate.toISOString(),
    // });
    // console.log("[Digest] Date range (Local):", {
    //   start: startDate.toLocaleString(),
    //   end: endDate.toLocaleString(),
    // });
    // console.log("[Digest] Current device time:", new Date().toLocaleString());

    // Get all conversations user is a member of
    const convosRef = collection(firebaseFirestore, "conversations");
    const q = query(convosRef, where("members", "array-contains", uid));

    const snapshot = await getDocs(q);
    // console.log("[Digest] Found conversations:", snapshot.size);
    const conversations: DigestConversation[] = [];

    // For each conversation, get messages in date range
    for (const convoDoc of snapshot.docs) {
      const cid = convoDoc.id;
      const convoData = convoDoc.data();

      // Check if user has cleared this conversation
      const clearedAt = convoData.clearedAt || {};
      const userClearedAt = clearedAt[uid];

      let clearedTimestamp: number | null = null;
      if (userClearedAt) {
        // Convert Firestore Timestamp to milliseconds
        clearedTimestamp =
          typeof userClearedAt === "number"
            ? userClearedAt
            : userClearedAt?.toMillis?.() || null;

        if (clearedTimestamp) {
          // console.log(
          //   `[Digest] User cleared conversation ${cid} at:`,
          //   new Date(clearedTimestamp).toLocaleString()
          // );
        }
      }

      let name =
        convoData.groupName || convoData.name || "Unnamed Conversation";

      // For DMs, get the other user's display name
      const members = convoData.members || [];
      if (members.length === 2 && !convoData.groupName) {
        const otherUserId = members.find((m: string) => m !== uid);
        if (otherUserId) {
          try {
            const userDoc = await getDoc(
              doc(firebaseFirestore, "users", otherUserId)
            );
            if (userDoc.exists()) {
              const userData = userDoc.data();
              name = userData.displayName || userData.email || "Unknown User";
            }
          } catch (error) {
            console.error("[Digest] Error fetching user displayName:", error);
          }
        }
      }

      // Get messages in range
      const messagesRef = collection(
        firebaseFirestore,
        "conversations",
        cid,
        "messages"
      );

      // First check: how many total messages exist?
      const allMessagesQuery = query(messagesRef, limit(1));
      const allMsgs = await getDocs(allMessagesQuery);
      // console.log(
      //   `[Digest] ${name}: Total messages exist: ${
      //     allMsgs.size > 0 ? "YES" : "NO"
      //   }`
      // );

      // If messages exist, log the timestamp of the latest one
      if (allMsgs.size > 0) {
        // console.log(
        //   `[Digest] ${name}: Latest message timestamp:`,
        //   allMsgs.docs[0].data().timestamp?.toDate() ? allMsgs.docs[0].data().timestamp.toDate().toLocaleString() : "NO TIMESTAMP"
        // );
      }

      // Log the Firestore Timestamp values we're querying with
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);
      // console.log(`[Digest] ${name}: Querying Firestore with timestamps:`, {
      //   start: startTimestamp.toDate().toLocaleString(),
      //   end: endTimestamp.toDate().toLocaleString(),
      // });

      // Query for messages in the date range
      const messagesQuery = query(
        messagesRef,
        where("timestamp", ">=", startTimestamp),
        where("timestamp", "<=", endTimestamp),
        orderBy("timestamp", "desc"),
        limit(50) // Get more messages to filter through
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      // Filter to only messages from OTHER users (not the current user)
      // AND messages sent AFTER the user cleared the conversation (if applicable)
      const otherUserMessages = messagesSnapshot.docs.filter((doc) => {
        const msgData = doc.data();
        const msgTimestamp = msgData.timestamp?.toMillis();

        // Must be from another user
        if (msgData.senderId === uid) {
          return false;
        }

        // If user cleared conversation, only show messages sent after that
        if (clearedTimestamp && msgTimestamp) {
          const isAfterClear = msgTimestamp > clearedTimestamp;
          if (!isAfterClear) {
            // console.log(
            //   `[Digest] ${name}: Excluding message from ${new Date(
            //     msgTimestamp
            //   ).toLocaleString()} ` +
            //     `(cleared at ${new Date(clearedTimestamp).toLocaleString()})`
            // );
          }
          return isAfterClear;
        }

        return true;
      });

      // console.log(
      //   `[Digest] ${name}: Found ${messagesSnapshot.size} total messages, ${
      //     otherUserMessages.length
      //   } from other users${
      //     clearedTimestamp ? " (filtered by clear time)" : ""
      //   }`
      // );

      // Push EACH message as a separate entry
      for (const msgDoc of otherUserMessages) {
        const msgData = msgDoc.data();
        const msgText = msgData.text || "[Media]";
        const msgTimestamp = msgData.timestamp?.toMillis() || Date.now();

        conversations.push({
          cid,
          name,
          messageCount: 1, // Each entry is 1 message
          latestMessage: msgText.substring(0, 100), // Truncate
          latestTimestamp: msgTimestamp,
          messageId: msgDoc.id,
          senderId: msgData.senderId,
        });
      }
    }

    return conversations.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  } catch (error) {
    console.error("Error fetching conversations in range:", error);
    return [];
  }
}

/**
 * Format digest content as markdown
 */
function formatDigestContent(
  todayConvos: DigestConversation[],
  yesterdayConvos: DigestConversation[]
): string {
  // For digest content, we just return a simple overview
  if (todayConvos.length === 0 && yesterdayConvos.length === 0) {
    return "No new messages today or yesterday.";
  }

  const parts: string[] = [];
  if (todayConvos.length > 0) {
    parts.push(
      `${todayConvos.length} message${todayConvos.length > 1 ? "s" : ""} today`
    );
  }
  if (yesterdayConvos.length > 0) {
    parts.push(
      `${yesterdayConvos.length} message${
        yesterdayConvos.length > 1 ? "s" : ""
      } yesterday`
    );
  }

  return parts.join(" • ");
}

/**
 * Generate a daily digest
 * @param uid User ID
 * @param forceRefresh Skip cache and generate new digest
 */
export async function generateDailyDigest(
  uid: string,
  forceRefresh: boolean = false
): Promise<DailyDigest> {
  const today = getTodayString();
  // console.log(
  //   `[Digest] generateDailyDigest called with forceRefresh=${forceRefresh}`
  // );

  // If forceRefresh, clear cache first
  if (forceRefresh) {
    // console.log("[Digest] Force refresh - clearing cache");
    await clearDigestCache(uid);
  }

  // Try to load from cache first (only if not forceRefresh)
  if (!forceRefresh) {
    const cached = await loadDigestFromCache(uid, today);
    if (cached) {
      // console.log("[Digest] Returning cached digest");
      return cached;
    }
  }

  // Generate new digest
  // console.log("[Digest] Generating fresh digest...");
  try {
    const todayRange = getTodayRange();
    const yesterdayRange = getYesterdayRange();

    const todayConvos = await getConversationsInRange(
      uid,
      todayRange.start,
      todayRange.end
    );
    const yesterdayConvos = await getConversationsInRange(
      uid,
      yesterdayRange.start,
      yesterdayRange.end
    );

    const content = formatDigestContent(todayConvos, yesterdayConvos);
    // console.log("[Digest] Generated content:", content);
    // console.log("[Digest] Today messages count:", todayConvos.length);
    // console.log("[Digest] Yesterday messages count:", yesterdayConvos.length);

    const digest: DailyDigest = {
      uid,
      content,
      todayConversations: todayConvos,
      yesterdayConversations: yesterdayConvos,
      createdAt: Date.now(),
      day: today,
    };

    // Save to cache
    await saveDigestToCache(digest);

    return digest;
  } catch (error) {
    console.error("Error generating daily digest:", error);
    throw error;
  }
}

/**
 * Clear cached digest
 */
export async function clearDigestCache(uid: string): Promise<void> {
  try {
    const today = getTodayString();
    const key = CACHE_KEY(uid, today);
    // console.log("[Digest] Clearing cache for key:", key);
    await AsyncStorage.removeItem(key);
    // console.log("[Digest] Cache cleared successfully");
  } catch (error) {
    console.warn("Error clearing digest cache:", error);
  }
}
