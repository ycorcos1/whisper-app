/**
 * Read Receipts API
 * Handles tracking which messages each user has read in group chats
 */

import {
  firebaseFirestore,
  firebaseAuth,
  collection,
  doc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "../../lib/firebase";

export interface ParticipantDoc {
  userId: string;
  lastReadMid: string; // Last message ID that this participant has read
  updatedAt: Timestamp;
}

export interface ParticipantReadStatus {
  userId: string;
  lastReadMid: string;
  updatedAt: Date;
}

/**
 * Update the current user's last read message ID in a conversation
 * @param conversationId - The conversation ID
 * @param messageId - The last message ID that the user has read
 */
export async function updateLastReadMessage(
  conversationId: string,
  messageId: string
): Promise<void> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) return;

  const participantRef = doc(
    firebaseFirestore,
    "conversations",
    conversationId,
    "participants",
    currentUser.uid
  );

  await setDoc(
    participantRef,
    {
      userId: currentUser.uid,
      lastReadMid: messageId,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Subscribe to participants' read receipts in a conversation
 * @param conversationId - The conversation ID
 * @param callback - Callback function to receive participant read statuses
 * @param onError - Error callback
 */
export function subscribeToReadReceipts(
  conversationId: string,
  callback: (participants: ParticipantReadStatus[]) => void,
  onError: (err: unknown) => void
) {
  const participantsRef = collection(
    firebaseFirestore,
    "conversations",
    conversationId,
    "participants"
  );

  return onSnapshot(
    participantsRef,
    (snapshot) => {
      const participants: ParticipantReadStatus[] = snapshot.docs.map((d) => {
        const data = d.data() as ParticipantDoc;
        const timestampRaw = data.updatedAt as Timestamp | unknown;
        const updatedAt =
          timestampRaw &&
          typeof (timestampRaw as Timestamp).toDate === "function"
            ? (timestampRaw as Timestamp).toDate()
            : new Date();

        return {
          userId: data.userId,
          lastReadMid: data.lastReadMid,
          updatedAt,
        };
      });
      callback(participants);
    },
    onError
  );
}
