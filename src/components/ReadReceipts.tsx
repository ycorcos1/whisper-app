/**
 * ReadReceipts Component
 * Displays "seen by" label under messages in group chats
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme";

export interface ReadReceiptsProps {
  seenByNames: string[]; // Names of users who have seen this message
}

export function ReadReceipts({ seenByNames }: ReadReceiptsProps) {
  const [expanded, setExpanded] = useState(false);

  // Don't render anything if no one has seen it
  if (seenByNames.length === 0) {
    return null;
  }

  const allNames = seenByNames.join(", ");
  const hasOverflow = allNames.length > 40; // Approximate character count for one line

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          if (hasOverflow) {
            setExpanded(!expanded);
          }
        }}
        disabled={!hasOverflow}
        activeOpacity={hasOverflow ? 0.7 : 1}
      >
        <Text
          style={styles.labelText}
          numberOfLines={expanded ? undefined : 1}
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
  labelText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  seenByLabel: {
    fontStyle: "italic",
  },
  namesText: {
    fontWeight: theme.typography.fontWeight.medium,
  },
});
