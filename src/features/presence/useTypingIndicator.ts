/**
 * Typing Indicator Hook
 * Manages typing status for current user and subscribes to others' typing status
 * - 250ms debounce before setting typing=true
 * - 2s TTL (auto-clear after 2s of no activity)
 */

import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { ref, set, onValue, off } from "firebase/database";
import { firebaseDatabase } from "../../lib/firebase";
import { AuthContext } from "../../state/auth/AuthContext";

const TYPING_DEBOUNCE = 250; // 250ms
const TYPING_TTL = 2000; // 2s

interface TypingUser {
  userId: string;
  isTyping: boolean;
}

export const useTypingIndicator = (conversationId: string) => {
  const { firebaseUser } = useContext(AuthContext);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ttlTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Subscribe to typing indicators for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const typingRef = ref(firebaseDatabase, `typing/${conversationId}`);

    const handleTypingChange = (snapshot: any) => {
      const data = snapshot.val();

      if (data) {
        const users: TypingUser[] = Object.entries(data)
          .filter(([userId, isTyping]) => {
            // Exclude current user and only include users who are typing
            return userId !== firebaseUser?.uid && isTyping === true;
          })
          .map(([userId]) => ({
            userId,
            isTyping: true,
          }));
        setTypingUsers(users);
      } else {
        setTypingUsers([]);
      }
    };

    onValue(typingRef, handleTypingChange);

    return () => {
      off(typingRef, "value", handleTypingChange);
    };
  }, [conversationId, firebaseUser?.uid]);

  // Set typing status for current user
  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!firebaseUser?.uid || !conversationId) return;

      const typingRef = ref(
        firebaseDatabase,
        `typing/${conversationId}/${firebaseUser.uid}`
      );

      try {
        await set(typingRef, isTyping);
      } catch (error) {
        console.error("❌ Error setting typing status:", error);
      }
    },
    [firebaseUser?.uid, conversationId]
  );

  // Handle typing with debounce and TTL
  const handleTyping = useCallback(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear existing TTL timer
    if (ttlTimerRef.current) {
      clearTimeout(ttlTimerRef.current);
    }

    // Set typing after debounce
    debounceTimerRef.current = setTimeout(() => {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        setTyping(true);
      }

      // Auto-clear typing after TTL
      ttlTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        setTyping(false);
      }, TYPING_TTL) as any;
    }, TYPING_DEBOUNCE) as any;
  }, [setTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (ttlTimerRef.current) {
      clearTimeout(ttlTimerRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      setTyping(false);
    }
  }, [setTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (ttlTimerRef.current) {
        clearTimeout(ttlTimerRef.current);
      }
      // Clear typing status on unmount
      if (firebaseUser?.uid && conversationId && isTypingRef.current) {
        const typingRef = ref(
          firebaseDatabase,
          `typing/${conversationId}/${firebaseUser.uid}`
        );
        set(typingRef, false).catch((error) => {
          console.error("❌ Error clearing typing on unmount:", error);
        });
      }
    };
  }, [firebaseUser?.uid, conversationId]);

  return {
    typingUsers,
    handleTyping,
    stopTyping,
  };
};
