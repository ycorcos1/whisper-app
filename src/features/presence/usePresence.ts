/**
 * Presence Hook
 * Manages user's online/offline status with RTDB
 * - User is online when app is open and logged in
 * - User is offline when app is closed or in background
 * - Heartbeat every 30s to maintain connection
 * - Auto disconnect handling
 */

import { useEffect, useRef, useContext } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  ref,
  set,
  onDisconnect,
  serverTimestamp as rtdbServerTimestamp,
} from "firebase/database";
import { firebaseDatabase, firebaseAuth } from "../../lib/firebase";
import { AuthContext } from "../../state/auth/AuthContext";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const usePresence = () => {
  const { firebaseUser } = useContext(AuthContext);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceRefRef = useRef<any>(null);
  const isAppActiveRef = useRef<boolean>(true);

  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const userId = firebaseUser.uid;
    const presenceRef = ref(firebaseDatabase, `presence/${userId}`);
    presenceRefRef.current = presenceRef;

    // Set user as online
    const setOnline = async () => {
      try {
        await set(presenceRef, {
          online: true,
          lastActive: rtdbServerTimestamp(),
        });

        // Set up onDisconnect handler to mark user offline
        const disconnectRef = onDisconnect(presenceRef);
        await disconnectRef.set({
          online: false,
          lastActive: rtdbServerTimestamp(),
        });

        console.log("✅ Presence set to online for user:", userId);
      } catch (error) {
        console.error("❌ Error setting presence:", error);
      }
    };

    // Set user as offline
    const setOffline = async () => {
      try {
        await set(presenceRef, {
          online: false,
          lastActive: rtdbServerTimestamp(),
        });
        console.log("✅ Presence set to offline for user:", userId);
      } catch (error) {
        console.error("❌ Error setting offline:", error);
      }
    };

    // Update presence heartbeat (keep online status while app is active)
    const updateHeartbeat = async () => {
      // Only send heartbeat if app is active
      if (!isAppActiveRef.current) return;

      try {
        await set(presenceRef, {
          online: true,
          lastActive: rtdbServerTimestamp(),
        });
      } catch (error) {
        console.error("❌ Error updating heartbeat:", error);
      }
    };

    // Initialize presence as online
    setOnline();

    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(
      updateHeartbeat,
      HEARTBEAT_INTERVAL
    );

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground - set online
        isAppActiveRef.current = true;
        setOnline();
      } else if (nextAppState === "background" || nextAppState === "inactive") {
        // App went to background - set offline
        isAppActiveRef.current = false;
        setOffline();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      appStateSubscription.remove();

      // Mark user as offline on cleanup only if still authenticated as same user
      const currentUid = firebaseAuth.currentUser?.uid;
      if (currentUid === userId) {
        set(presenceRef, {
          online: false,
          lastActive: rtdbServerTimestamp(),
        }).catch((error) => {
          console.error("❌ Error setting offline on cleanup:", error);
        });
      }
    };
  }, [firebaseUser?.uid]);

  return {};
};
