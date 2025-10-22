/**
 * Home Tabs Navigator
 * Bottom tab navigation: Conversations and Profile
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeTabsParamList } from "../navigation/types";
import { theme } from "../theme";

// Screens
import ConversationsScreen from "./ConversationsScreen";
import ProfileScreen from "./ProfileScreen";

// Simple, stable icon components
import { Text } from "react-native";

const ConversationsIcon = () => <Text style={{ fontSize: 24 }}>💬</Text>;
const ProfileIcon = () => <Text style={{ fontSize: 24 }}>👤</Text>;

const Tab = createBottomTabNavigator<HomeTabsParamList>();

export default function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: theme.colors.amethystGlow,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeight.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          tabBarIcon: ConversationsIcon,
          tabBarLabel: "Chats",
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ProfileIcon,
          tabBarLabel: "Profile",
        }}
      />
    </Tab.Navigator>
  );
}
