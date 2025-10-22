/**
 * Presence Badge Component
 * Displays online/offline status indicator
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { useUserPresence } from "../features/presence";
import { theme } from "../theme";

interface PresenceBadgeProps {
  userId: string | null;
  size?: "small" | "medium" | "large";
  style?: any;
}

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  userId,
  size = "medium",
  style,
}) => {
  const { online } = useUserPresence(userId);

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        online ? styles.online : styles.offline,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  small: {
    width: 8,
    height: 8,
  },
  medium: {
    width: 12,
    height: 12,
  },
  large: {
    width: 16,
    height: 16,
  },
  online: {
    backgroundColor: "#4ade80", // Green for online
  },
  offline: {
    backgroundColor: theme.colors.textSecondary, // Gray for offline
  },
});

