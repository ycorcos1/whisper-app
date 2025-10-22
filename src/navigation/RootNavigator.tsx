/**
 * Root Navigator
 * Main navigation structure with auth state routing
 */

import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./types";
import { useAuth } from "../state/auth/useAuth";
import { theme } from "../theme";
import { NotificationBanner } from "../components/NotificationBanner";

// Screens
import AuthScreen from "../screens/AuthScreen";
import HomeTabs from "../screens/HomeTabs";
import ChatScreen from "../screens/ChatScreen";
import ChatSettingsScreen from "../screens/ChatSettingsScreen";
import NewChatScreen from "../screens/NewChatScreen";

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { firebaseUser, loading } = useAuth();

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.amethystGlow} />
      </View>
    );
  }

  const isAuthenticated = firebaseUser !== null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth flow
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              animationTypeForReplace: "pop",
            }}
          />
        ) : (
          // Authenticated flow
          <>
            <Stack.Screen name="Home" component={HomeTabs} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                headerShown: true,
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="ChatSettings"
              component={ChatSettingsScreen}
              options={{
                headerShown: true,
                headerTitle: "Chat Settings",
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="NewChat"
              component={NewChatScreen}
              options={{
                headerShown: true,
                headerTitle: "New Chat",
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
      {/* Only show notifications when authenticated */}
      {isAuthenticated && <NotificationBanner />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});
