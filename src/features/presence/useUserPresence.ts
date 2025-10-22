/**
 * User Presence Hook
 * Subscribe to another user's presence status
 */

import { useState, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { firebaseDatabase } from "../../lib/firebase";

export interface UserPresence {
  online: boolean;
  lastActive: number | null;
}

export const useUserPresence = (userId: string | null): UserPresence => {
  const [presence, setPresence] = useState<UserPresence>({
    online: false,
    lastActive: null,
  });

  useEffect(() => {
    if (!userId) {
      setPresence({ online: false, lastActive: null });
      return;
    }

    const presenceRef = ref(firebaseDatabase, `presence/${userId}`);

    const handlePresenceChange = (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        setPresence({
          online: data.online ?? false,
          lastActive: data.lastActive ?? null,
        });
      } else {
        setPresence({ online: false, lastActive: null });
      }
    };

    // Subscribe to presence changes
    onValue(presenceRef, handlePresenceChange);

    // Cleanup
    return () => {
      off(presenceRef, "value", handlePresenceChange);
    };
  }, [userId]);

  return presence;
};

