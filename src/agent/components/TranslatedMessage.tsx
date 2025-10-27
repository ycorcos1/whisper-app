/**
 * Translated Message Component
 * Displays a message with translation in translator mode
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { TranslatedMessage as TranslatedMessageType } from "../translation/types";
import * as Clipboard from "expo-clipboard";

interface TranslatedMessageProps {
  message: TranslatedMessageType;
  isOwn: boolean;
  onExpand?: (messageId: string) => void;
}

export const TranslatedMessage: React.FC<TranslatedMessageProps> = ({
  message,
  isOwn,
  onExpand,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = message.translatedText || message.originalText;
    await Clipboard.setStringAsync(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleOriginal = () => {
    const newState = !showOriginal;
    setShowOriginal(newState);
    if (onExpand) {
      onExpand(message.id);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if translation is available
  const hasTranslation =
    message.translatedText && message.translatedText !== message.originalText;

  // Check if there's an error
  const hasError = !!message.translationError;

  return (
    <View style={[styles.container, isOwn && styles.containerOwn]}>
      {/* Sender name and time (for received messages) */}
      {!isOwn && (
        <View style={styles.header}>
          <Text style={styles.senderName}>
            {message.senderName || "Unknown"}
          </Text>
          <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
        </View>
      )}

      {/* Message bubble */}
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        {/* Translated text (or original if no translation) */}
        <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
          {hasTranslation ? message.translatedText : message.originalText}
        </Text>

        {/* Translation indicator */}
        {hasTranslation && (
          <View style={styles.translationIndicator}>
            <MaterialCommunityIcons
              name="translate"
              size={12}
              color={isOwn ? "#FFFFFF80" : theme.colors.textSecondary}
            />
            <Text
              style={[styles.indicatorText, isOwn && styles.indicatorTextOwn]}
            >
              Translated from {message.sourceLanguage}
            </Text>
          </View>
        )}

        {/* Error indicator */}
        {hasError && (
          <View style={styles.errorIndicator}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={12}
              color="#C62828"
            />
            <Text style={styles.errorText}>Translation failed</Text>
          </View>
        )}

        {/* Original text (expandable) */}
        {hasTranslation && showOriginal && (
          <View style={styles.originalContainer}>
            <Text
              style={[styles.originalLabel, isOwn && styles.originalLabelOwn]}
            >
              Original:
            </Text>
            <Text
              style={[styles.originalText, isOwn && styles.originalTextOwn]}
            >
              {message.originalText}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {/* Show original toggle */}
          {hasTranslation && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleOriginal}
              accessible={true}
              accessibilityLabel={
                showOriginal ? "Hide original text" : "Show original text"
              }
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name={showOriginal ? "chevron-up" : "chevron-down"}
                size={14}
                color={isOwn ? "#FFFFFF80" : theme.colors.textSecondary}
              />
              <Text style={[styles.actionText, isOwn && styles.actionTextOwn]}>
                {showOriginal ? "Hide" : "Show"} original
              </Text>
            </TouchableOpacity>
          )}

          {/* Copy button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCopy}
            accessible={true}
            accessibilityLabel="Copy message"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={copied ? "check" : "content-copy"}
              size={14}
              color={isOwn ? "#FFFFFF80" : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, isOwn && styles.actionTextOwn]}>
              {copied ? "Copied!" : "Copy"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timestamp (for own messages) */}
      {isOwn && (
        <View style={styles.ownFooter}>
          <Text style={styles.ownTimestamp}>
            {formatTime(message.timestamp)}
          </Text>
          {hasTranslation && (
            <Text style={styles.sentLanguageIndicator}>
              ✓ Sent in {message.targetLanguage}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  containerOwn: {
    alignItems: "flex-end",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  senderName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  bubble: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleOwn: {
    backgroundColor: theme.colors.amethystGlow,
    borderColor: theme.colors.amethystGlow,
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: "#FFFFFF",
  },
  translationIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(139, 92, 246, 0.2)",
  },
  indicatorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  indicatorTextOwn: {
    color: "#FFFFFF80",
  },
  errorIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#FFCDD2",
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: "#C62828",
    fontStyle: "italic",
  },
  originalContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(139, 92, 246, 0.2)",
  },
  originalLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: 4,
  },
  originalLabelOwn: {
    color: "#FFFFFF80",
  },
  originalText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  originalTextOwn: {
    color: "#FFFFFFCC",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  actionTextOwn: {
    color: "#FFFFFF80",
  },
  ownFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  ownTimestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  sentLanguageIndicator: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.success,
    fontStyle: "italic",
  },
});

// Memoize component to prevent unnecessary re-renders
export default React.memo(TranslatedMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.translatedText === nextProps.message.translatedText &&
    prevProps.message.showOriginal === nextProps.message.showOriginal &&
    prevProps.isOwn === nextProps.isOwn
  );
});
