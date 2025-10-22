import {
  firebaseFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
} from "../../lib/firebase";
import { firebaseAuth } from "../../lib/firebase";
import type { FieldValue } from "firebase/firestore";

export interface ConversationDoc {
  members: string[];
  type: "dm" | "group";
  groupName?: string; // For group chats
  // For DMs: deterministic key to dedupe (sorted uidA_uidB)
  dmKey?: string;
  // Per-user clear semantics: map of userId -> Timestamp when they cleared
  clearedAt?: { [userId: string]: Timestamp | FieldValue };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp | FieldValue;
  };
  updatedAt: Timestamp | FieldValue;
}

export interface ConversationListItem {
  id: string;
  name: string;
  lastMessageText: string;
  updatedAt: Date;
  lastMessageTimestamp?: Date; // Timestamp of the last message (for notification filtering)
  otherUserId?: string; // For DM conversations, the other user's ID (for presence)
}

export function subscribeToUserConversations(
  callback: (items: ConversationListItem[]) => void,
  onError: (err: unknown) => void
) {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    callback([]);
    return () => undefined;
  }

  const q = query(
    collection(firebaseFirestore, "conversations"),
    where("members", "array-contains", currentUser.uid),
    orderBy("updatedAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const items: ConversationListItem[] = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data() as ConversationDoc;

          let name: string;
          let otherUserId: string | undefined;

          if (data.type === "group") {
            // For group chats, use groupName if it exists, otherwise show member names
            if (data.groupName) {
              name = data.groupName;
            } else {
              const otherMembers = data.members.filter(
                (m) => m !== currentUser.uid
              );
              const memberNames = await Promise.all(
                otherMembers.map(async (memberId) => {
                  try {
                    const memberDoc = await getDoc(
                      doc(firebaseFirestore, "users", memberId)
                    );
                    if (memberDoc.exists()) {
                      const u = memberDoc.data() as {
                        displayName?: string;
                        email?: string;
                      };
                      return u.displayName ?? u.email ?? memberId;
                    }
                    return memberId;
                  } catch {
                    return memberId;
                  }
                })
              );
              name = memberNames.join(", ");
            }
            otherUserId = undefined; // No presence badge for groups
          } else {
            // For DM, show the other user's name
            const otherMember =
              data.members.find((m) => m !== currentUser.uid) ??
              currentUser.uid;

            // Default name is UID; try to resolve displayName from users/{uid}
            name = otherMember;
            try {
              const otherDoc = await getDoc(
                doc(firebaseFirestore, "users", otherMember)
              );
              if (otherDoc.exists()) {
                const u = otherDoc.data() as {
                  displayName?: string;
                  email?: string;
                };
                name = u.displayName ?? u.email ?? otherMember;
              }
            } catch {
              // ignore lookup errors; keep UID as fallback
            }
            otherUserId = otherMember;
          }

          // If user has cleared this conversation, check if there's a new message after clear
          const clearedAt = data.clearedAt?.[currentUser.uid];
          const lastMessageTimestampForClearing = data.lastMessage
            ?.timestamp as Timestamp | undefined;

          // Hide conversation if:
          // 1. User has cleared it AND
          // 2. There's either no last message OR the last message was before the clear
          if (clearedAt) {
            const clearedTimestamp = (clearedAt as Timestamp).toMillis?.() ?? 0;
            const lastMsgTimestamp =
              lastMessageTimestampForClearing?.toMillis?.() ?? 0;

            if (lastMsgTimestamp <= clearedTimestamp) {
              // Conversation should be hidden - return null to filter out
              return null;
            }
          }

          const updatedAtRaw = data.updatedAt as Timestamp | unknown;
          const updatedAt =
            updatedAtRaw && typeof (updatedAtRaw as any).toDate === "function"
              ? (updatedAtRaw as Timestamp).toDate()
              : new Date(0);

          // Get last message timestamp for notification filtering
          const lastMessageTimestampRaw = data.lastMessage?.timestamp as
            | Timestamp
            | undefined;
          const lastMessageTimestamp =
            lastMessageTimestampRaw &&
            typeof lastMessageTimestampRaw.toDate === "function"
              ? lastMessageTimestampRaw.toDate()
              : undefined;

          return {
            id: d.id,
            name,
            lastMessageText: data.lastMessage?.text ?? "",
            updatedAt,
            lastMessageTimestamp,
            otherUserId,
          };
        })
      );
      // Filter out null entries (cleared conversations with no new messages)
      callback(
        items.filter((item): item is ConversationListItem => item !== null)
      );
    },
    onError
  );
}

export async function createDirectConversationWith(userId: string) {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const members = [currentUser.uid, userId].sort();
  const dmKey = `${members[0]}_${members[1]}`;

  // First try to find an existing DM by dmKey
  const q = query(
    collection(firebaseFirestore, "conversations"),
    where("type", "==", "dm"),
    // Required by security rules so Firestore can validate access on queries
    where("members", "array-contains", currentUser.uid),
    where("dmKey", "==", dmKey)
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  // Create new DM with dmKey
  const ref = await addDoc(collection(firebaseFirestore, "conversations"), {
    members,
    type: "dm",
    dmKey,
    updatedAt: serverTimestamp(),
  } satisfies Partial<ConversationDoc>);

  return ref.id;
}

export async function createGroupConversation(userIds: string[]) {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  if (userIds.length < 2) {
    throw new Error("Group conversation requires at least 2 other users");
  }

  const members = [currentUser.uid, ...userIds].sort();

  const ref = await addDoc(collection(firebaseFirestore, "conversations"), {
    members,
    type: "group",
    updatedAt: serverTimestamp(),
  } satisfies Partial<ConversationDoc>);

  return ref.id;
}

export async function getConversation(
  conversationId: string
): Promise<ConversationDoc | null> {
  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) return null;

  return conversationSnap.data() as ConversationDoc;
}

/**
 * Subscribe to real-time updates for a single conversation
 */
export function subscribeToConversation(
  conversationId: string,
  callback: (conversation: ConversationDoc | null) => void,
  onError: (err: unknown) => void
) {
  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );

  return onSnapshot(
    conversationRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(snapshot.data() as ConversationDoc);
    },
    onError
  );
}

export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(firebaseFirestore, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data() as {
        displayName?: string;
        email?: string;
      };
      return userData.displayName ?? userData.email ?? userId;
    }
    return userId;
  } catch {
    return userId;
  }
}

/**
 * WARNING: This function deletes the entire conversation for ALL participants.
 * In most cases, you should use clearConversationForCurrentUser() instead,
 * which implements "delete for me" functionality.
 * Only use this for administrative purposes or when you really need to delete
 * the conversation for everyone.
 */
export async function deleteConversation(conversationId: string) {
  await deleteDoc(doc(firebaseFirestore, "conversations", conversationId));
}

/**
 * Clear a conversation for the current user only (per-user delete).
 * Sets clearedAt[currentUid] to server time so older messages are hidden and
 * the conversation disappears from the list until new messages arrive.
 */
export async function clearConversationForCurrentUser(conversationId: string) {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );
  await updateDoc(conversationRef, {
    [`clearedAt.${currentUser.uid}`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as any);
}

export async function updateGroupName(
  conversationId: string,
  groupName: string
) {
  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );
  await updateDoc(conversationRef, {
    groupName,
    updatedAt: serverTimestamp(),
  });
}

export async function addMembersToGroup(
  conversationId: string,
  userIds: string[]
) {
  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error("Conversation not found");
  }

  const conv = conversationSnap.data() as ConversationDoc;
  if (conv.type !== "group") {
    throw new Error("Can only add members to group conversations");
  }

  const updatedMembers = [...new Set([...conv.members, ...userIds])];

  await updateDoc(conversationRef, {
    members: updatedMembers,
    updatedAt: serverTimestamp(),
  });
}

export async function removeMemberFromGroup(
  conversationId: string,
  userId: string
) {
  const conversationRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId
  );
  const conversationSnap = await getDoc(conversationRef);

  if (!conversationSnap.exists()) {
    throw new Error("Conversation not found");
  }

  const conv = conversationSnap.data() as ConversationDoc;
  if (conv.type !== "group") {
    throw new Error("Can only remove members from group conversations");
  }

  const updatedMembers = conv.members.filter((m) => m !== userId);

  if (updatedMembers.length < 2) {
    throw new Error("Group must have at least 2 members");
  }

  await updateDoc(conversationRef, {
    members: updatedMembers,
    updatedAt: serverTimestamp(),
  });
}

export async function leaveGroup(conversationId: string) {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  await removeMemberFromGroup(conversationId, currentUser.uid);
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string; displayName?: string } | null> {
  try {
    const usersRef = collection(firebaseFirestore, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data() as {
      email?: string;
      displayName?: string;
    };

    return {
      id: userDoc.id,
      email: userData.email || email,
      displayName: userData.displayName,
    };
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}
