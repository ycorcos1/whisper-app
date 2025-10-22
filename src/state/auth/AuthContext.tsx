import React, { createContext, useState, useEffect, ReactNode } from "react";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import {
  firebaseAuth,
  firebaseFirestore,
  firebaseDatabase,
  ref,
  set,
} from "../../lib/firebase";
import { User, SignupData, LoginData } from "../../types/user";
import { clearAllCachesExceptPrefs } from "../../features/messages/persistence";

export interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  clearError: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(firebaseFirestore, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      }
      return null;
    } catch (err) {
      console.error("Error loading user profile:", err);
      return null;
    }
  };

  const createUserProfile = async (
    uid: string,
    email: string,
    displayName: string
  ): Promise<void> => {
    const userData: User = {
      uid,
      email,
      emailLower: email.toLowerCase(),
      displayName,
      photoURL: null,
      createdAt: serverTimestamp() as any,
    };

    await setDoc(doc(firebaseFirestore, "users", uid), userData);
  };

  const signup = async ({ email, password, displayName }: SignupData) => {
    try {
      setLoading(true);
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName });
      await createUserProfile(userCredential.user.uid, email, displayName);
    } catch (err: any) {
      // Surface a friendly message via context without throwing/logging an error
      setError(getAuthErrorMessage(err?.code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  const login = async ({ email, password }: LoginData) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err: any) {
      // Surface a friendly message via context without throwing/logging an error
      setError(getAuthErrorMessage(err?.code ?? ""));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        // Attempt to mark RTDB presence offline before auth state clears
        try {
          await set(ref(firebaseDatabase, `presence/${firebaseUser.uid}`), {
            online: false,
            lastActive: serverTimestamp() as any,
          } as any);
        } catch (e) {
          // Non-fatal; RTDB rules may deny after sign-out race
        }
      }
      await firebaseSignOut(firebaseAuth);

      // Clear all caches except theme preferences
      await clearAllCachesExceptPrefs();
    } catch (err: any) {
      // Keep the UI calm; expose a friendly message without throwing
      setError("Failed to logout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const profile = await loadUserProfile(fbUser.uid);
        setUser(profile);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    error,
    signup,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please login instead.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/operation-not-allowed":
      return "Email/password authentication is not enabled.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
};
