/**
 * Member Data Synchronization Service
 * Keeps conversation member data in sync with user profile changes
 */

import {
  collection,
  getDocs,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { firebaseFirestore } from "../lib/firebase";

/**
 * Update member data in all conversations when a user changes their profile
 * This ensures the planner and other features see updated display names
 */
export async function syncMemberDataAcrossConversations(
  userId: string,
  updatedData: {
    displayName?: string;
    email?: string;
    photoURL?: string | null;
  }
): Promise<void> {
  try {
    // console.log("🔄 Syncing member data across conversations", {
    //   userId,
    //   updatedData,
    // });

    // Find all conversations where this user is a member
    const conversationsRef = collection(firebaseFirestore, "conversations");
    const conversationsSnap = await getDocs(conversationsRef);

    const batch = writeBatch(firebaseFirestore);
    let updateCount = 0;

    for (const conversationDoc of conversationsSnap.docs) {
      const conversationData = conversationDoc.data();

      // Check if user is a member of this conversation
      if (
        conversationData.members &&
        conversationData.members.includes(userId)
      ) {
        const conversationId = conversationDoc.id;

        // Update member data in the members subcollection
        const membersRef = collection(
          firebaseFirestore,
          `conversations/${conversationId}/members`
        );
        const membersSnap = await getDocs(membersRef);

        for (const memberDoc of membersSnap.docs) {
          const memberData = memberDoc.data();

          if (memberData.userId === userId) {
            // Update this member's data
            batch.update(memberDoc.ref, {
              ...updatedData,
              updatedAt: serverTimestamp(),
            });
            updateCount++;
            break; // Found the member, no need to continue
          }
        }
      }
    }

    if (updateCount > 0) {
      await batch.commit();
      //   console.log("✅ Updated member data in conversations", {
      //     userId,
      //     conversationsUpdated: updateCount,
      //   });
    } else {
      //   console.log("ℹ️ No conversations found to update", { userId });
    }
  } catch (error) {
    console.error("Error syncing member data:", error);
    throw error;
  }
}

/**
 * Update member data in a specific conversation
 */
export async function syncMemberDataInConversation(
  conversationId: string,
  userId: string,
  updatedData: {
    displayName?: string;
    email?: string;
    photoURL?: string | null;
  }
): Promise<void> {
  try {
    const membersRef = collection(
      firebaseFirestore,
      `conversations/${conversationId}/members`
    );
    const membersSnap = await getDocs(membersRef);

    for (const memberDoc of membersSnap.docs) {
      const memberData = memberDoc.data();

      if (memberData.userId === userId) {
        await updateDoc(memberDoc.ref, {
          ...updatedData,
          updatedAt: serverTimestamp(),
        });

        // console.log("✅ Updated member data in conversation", {
        //   conversationId,
        //   userId,
        //   updatedData,
        // });
        return;
      }
    }

    // console.log("ℹ️ Member not found in conversation", {
    //   conversationId,
    //   userId,
    // });
  } catch (error) {
    console.error("Error syncing member data in conversation:", error);
    throw error;
  }
}
