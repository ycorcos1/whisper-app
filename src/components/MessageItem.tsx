/**
 * MessageItem Component
 * Displays a single message with delivery status indicators
 */

import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { theme } from "../theme";
import type { Message } from "../features/messages";

export interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isOptimistic?: boolean;
  error?: string;
  showSender?: boolean; // For group chats
}

export function MessageItem({
  message,
  isOwn,
  isOptimistic = false,
  error,
  showSender = false,
}: MessageItemProps) {
  const renderStatusIndicator = () => {
    // Only show status indicators for own messages
    if (!isOwn) return null;

    if (isOptimistic) {
      return (
        <View style={styles.statusContainer}>
          {error ? (
            <Text style={styles.errorText}>✕</Text>
          ) : (
            <ActivityIndicator size="small" color="#FFFFFF" />
          )}
        </View>
      );
    }

    // Show checkmarks based on status
    switch (message.status) {
      case "sending":
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>⏱</Text>
          </View>
        );
      case "sent":
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>✓</Text>
          </View>
        );
      case "delivered":
        return (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>✓✓</Text>
          </View>
        );
      case "read":
        return (
          <View style={styles.statusContainer}>
            <Text style={[styles.statusIcon, styles.readIcon]}>✓✓</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
          isOptimistic && styles.optimisticBubble,
        ]}
      >
        {showSender && message.senderName && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.ownText : styles.otherText,
          ]}
        >
          {message.text}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.timestampText,
              isOwn ? styles.ownTimestamp : styles.otherTimestamp,
            ]}
          >
            {formatTime(message.timestamp)}
          </Text>
          {renderStatusIndicator()}
        </View>
        {error && (
          <Text style={styles.errorMessage}>Failed to send. Retrying...</Text>
        )}
      </View>
    </View>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    // Show time only for today's messages
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    // Show date for older messages
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: theme.spacing.xs,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
  },
  ownBubble: {
    backgroundColor: theme.colors.amethystGlow,
  },
  otherBubble: {
    backgroundColor: theme.colors.surface,
  },
  optimisticBubble: {
    opacity: 0.7,
  },
  senderName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.amethystGlow,
    marginBottom: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    lineHeight:
      theme.typography.fontSize.base * theme.typography.lineHeight.normal,
  },
  ownText: {
    color: "#FFFFFF",
  },
  otherText: {
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  timestampText: {
    fontSize: theme.typography.fontSize.xs,
    opacity: 0.7,
  },
  ownTimestamp: {
    color: "#FFFFFF",
  },
  otherTimestamp: {
    color: theme.colors.textSecondary,
  },
  statusContainer: {
    marginLeft: 4,
    minWidth: 16,
    alignItems: "center",
  },
  statusIcon: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  readIcon: {
    color: "#4FC3F7", // Light blue for read status
    opacity: 1,
  },
  errorText: {
    fontSize: 12,
    color: "#ff6b6b",
    fontWeight: "bold",
  },
  errorMessage: {
    fontSize: theme.typography.fontSize.xs,
    color: "#ff6b6b",
    fontStyle: "italic",
    marginTop: theme.spacing.xs,
  },
});
