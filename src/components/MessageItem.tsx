/**
 * MessageItem Component
 * Displays a single message with delivery status indicators
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from "react-native";
import { theme } from "../theme";
import type { Message } from "../features/messages";
import { ReadReceipts } from "./ReadReceipts";

export interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isOptimistic?: boolean;
  error?: string;
  showSender?: boolean; // For group chats
  onImagePress?: (imageUrl: string) => void; // Callback for image press
  seenByNames?: string[]; // For group chat read receipts
}

export function MessageItem({
  message,
  isOwn,
  isOptimistic = false,
  error,
  showSender = false,
  onImagePress,
  seenByNames,
}: MessageItemProps) {
  const [imageLoading, setImageLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);

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

  const renderImageMessage = () => {
    if (!message.image) return null;

    const imageUrl = message.image.thumbnailUrl || message.image.url;

    return (
      <TouchableOpacity
        onPress={() => onImagePress?.(message.image!.url)}
        disabled={!onImagePress}
        activeOpacity={0.8}
      >
        <View style={styles.imageMessageContainer}>
          {imageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator
                size="small"
                color={isOwn ? "#FFFFFF" : theme.colors.amethystGlow}
              />
            </View>
          )}
          {imageError ? (
            <View style={styles.imageErrorContainer}>
              <Text
                style={[
                  styles.imageErrorText,
                  isOwn ? styles.ownText : styles.otherText,
                ]}
              >
                Failed to load image
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
          {message.text && (
            <Text
              style={[
                styles.imageCaptionText,
                isOwn ? styles.ownText : styles.otherText,
              ]}
            >
              {message.text}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTextMessage = () => {
    if (!message.text || message.type === "image") return null;

    return (
      <Text
        style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}
      >
        {message.text}
      </Text>
    );
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
          message.type === "image" && styles.imageBubble,
        ]}
      >
        {showSender && message.senderName && (
          <Text style={styles.senderName}>{message.senderName}</Text>
        )}
        {message.type === "image" ? renderImageMessage() : renderTextMessage()}
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
      {/* Show read receipts for group chats */}
      {seenByNames && seenByNames.length > 0 && (
        <ReadReceipts seenByNames={seenByNames} />
      )}
    </View>
  );
}

function formatTime(date: Date): string {
  // Always show time in hh:mm format
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // 24-hour format (hh:mm)
  });
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
  imageBubble: {
    padding: theme.spacing.xs,
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
  imageMessageContainer: {
    minWidth: 200,
    minHeight: 150,
    maxWidth: 250,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  messageImage: {
    width: "100%",
    height: 200,
    borderRadius: theme.borderRadius.lg,
  },
  imageLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    zIndex: 1,
  },
  imageErrorContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  imageErrorText: {
    fontSize: theme.typography.fontSize.sm,
    fontStyle: "italic",
  },
  imageCaptionText: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
});
