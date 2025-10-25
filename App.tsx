/**
 * Whisper App Root
 * Main application component with AuthProvider
 */

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/state/auth/AuthContext";
import { NotificationProvider } from "./src/state/NotificationContext";
import { CasperProvider } from "./src/agent/CasperProvider";
import AppNavigator from "./src/navigation/AppNavigator";
import { runMigrations } from "./src/features/messages/persistence";
import {
  startGlobalQueueProcessor,
  stopGlobalQueueProcessor,
} from "./src/features/messages/queueProcessor";
import { usePresence } from "./src/features/presence";

// Presence wrapper to initialize presence for authenticated users
const AppWithPresence = () => {
  usePresence(); // Initialize presence tracking

  return (
    <>
      <AppNavigator />
      <StatusBar style="light" />
    </>
  );
};

export default function App() {
  // Run migrations and start queue processor on app startup
  useEffect(() => {
    // Run schema migrations
    runMigrations();

    // Start global queue processor to handle offline messages
    startGlobalQueueProcessor();

    // Cleanup on app unmount
    return () => {
      stopGlobalQueueProcessor();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <CasperProvider>
              <AppWithPresence />
            </CasperProvider>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
