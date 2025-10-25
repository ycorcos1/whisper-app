/**
 * ReadReceipts Component
 * Displays "seen by" label under messages in group chats
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";

export interface ReadReceiptsProps {
  seenByNames: string[]; // Names of users who have seen this message
  onExpand?: () => void; // Callback when expanded
  onCollapse?: () => void; // Callback when collapsed
  isExpanded?: boolean; // External control of expanded state
}

export function ReadReceipts({
  seenByNames,
  onExpand,
  onCollapse,
  isExpanded,
}: ReadReceiptsProps) {
  const [expanded, setExpanded] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isCurrentlyExpanded = isExpanded !== undefined ? isExpanded : expanded;

  // Don't render anything if no one has seen it
  if (seenByNames.length === 0) {
    return null;
  }

  const allNames = seenByNames.join(", ");
  const hasOverflow = allNames.length > 40; // Approximate character count for one line

  const handlePress = () => {
    if (isExpanded !== undefined) {
      // External state control
      if (isCurrentlyExpanded) {
        onCollapse?.();
      } else {
        onExpand?.();
      }
    } else {
      // Internal state control
      const newExpanded = !expanded;
      setExpanded(newExpanded);
      if (newExpanded) {
        onExpand?.();
      } else {
        onCollapse?.();
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={styles.touchableContainer}
      >
        <Text
          style={styles.labelText}
          numberOfLines={isCurrentlyExpanded ? undefined : 1}
          ellipsizeMode="tail"
        >
          <Text style={styles.seenByLabel}>seen by </Text>
          <Text style={styles.namesText}>{allNames}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "50%", // Only take up left half of screen
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  touchableContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  seenByLabel: {
    fontStyle: "italic",
  },
  namesText: {
    fontWeight: theme.typography.fontWeight.medium,
  },
});
