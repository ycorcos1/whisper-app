/**
 * Contacts API
 * Manages user contacts (one-directional relationships)
 */

import {
  firebaseFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  Timestamp,
  query,
  orderBy,
} from "../../lib/firebase";
import { firebaseAuth } from "../../lib/firebase";

/**
 * Contact document structure
 */
export interface Contact {
  contactUid: string;
  addedAt: Timestamp;
}

/**
 * Add a contact for the current user
 * One-directional: A adding B does not add A to B
 */
export async function addContact(contactUid: string): Promise<void> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  if (currentUser.uid === contactUid) {
    throw new Error("Cannot add yourself as a contact");
  }

  const contactRef = doc(
    firebaseFirestore,
    `users/${currentUser.uid}/contacts/${contactUid}`
  );

  await setDoc(contactRef, {
    contactUid,
    addedAt: Timestamp.now(),
  });
}

/**
 * Remove a contact for the current user
 */
export async function removeContact(contactUid: string): Promise<void> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const contactRef = doc(
    firebaseFirestore,
    `users/${currentUser.uid}/contacts/${contactUid}`
  );

  await deleteDoc(contactRef);
}

/**
 * Check if a user is a contact of the current user
 */
export async function isContact(contactUid: string): Promise<boolean> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    return false;
  }

  const contactRef = doc(
    firebaseFirestore,
    `users/${currentUser.uid}/contacts/${contactUid}`
  );

  const contactSnap = await getDoc(contactRef);
  return contactSnap.exists();
}

/**
 * Get all contacts for the current user
 * Returns array of contact UIDs
 */
export async function getUserContacts(): Promise<string[]> {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    return [];
  }

  const contactsRef = collection(
    firebaseFirestore,
    `users/${currentUser.uid}/contacts`
  );
  const q = query(contactsRef, orderBy("addedAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.id);
}

/**
 * Subscribe to contacts changes for the current user
 * Calls callback with array of contact UIDs whenever contacts change
 */
export function subscribeToContacts(
  callback: (contactUids: string[]) => void,
  onError?: (error: Error) => void
): () => void {
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) {
    callback([]);
    return () => {};
  }

  const contactsRef = collection(
    firebaseFirestore,
    `users/${currentUser.uid}/contacts`
  );
  const q = query(contactsRef, orderBy("addedAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const contactUids = snapshot.docs.map((doc) => doc.id);
      callback(contactUids);
    },
    (error) => {
      console.error("Error subscribing to contacts:", error);
      if (onError) {
        onError(error);
      }
    }
  );

  return unsubscribe;
}
