/**
 * User Type Definitions
 * Defines the structure of user data in the app
 */

import { Timestamp } from "firebase/firestore";

/**
 * User document stored in Firestore /users collection
 * Note: Online/offline presence is tracked in Realtime Database, not here
 */
export interface User {
  uid: string;
  email: string;
  // Lowercased email for case-insensitive search
  emailLower: string;
  displayName: string;
  photoURL: string | null;
  createdAt: Timestamp;
}

/**
 * Partial user data for updates
 */
export type UserUpdate = Partial<
  Omit<User, "uid" | "email" | "emailLower" | "createdAt">
>;

/**
 * User data for signup (before Firestore document creation)
 */
export interface SignupData {
  email: string;
  password: string;
  displayName: string;
}

/**
 * User data for login
 */
export interface LoginData {
  email: string;
  password: string;
}
