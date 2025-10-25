/**
 * Translation Result Component
 * Displays translation results and generated messages with action buttons
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { sendMessage } from "../../features/messages/api";

interface TranslationResultProps {
  type: "translation" | "generated_response";
  originalText?: string;
  translatedText?: string;
  generatedResponse?: string;
  targetLanguage?: string;
  sourceLanguage?: string;
  conversationId: string;
  onSend?: (messageId: string) => void;
  onEdit?: () => void;
}

export const TranslationResult: React.FC<TranslationResultProps> = ({
  type,
  originalText,
  translatedText,
  generatedResponse,
  targetLanguage,
  sourceLanguage,
  conversationId,
  onSend,
  onEdit,
}) => {
  const [isSent, setIsSent] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (isSent || isSending) return;

    try {
      setIsSending(true);
      const textToSend =
        type === "translation" ? translatedText : generatedResponse;
      if (!textToSend) return;

      const messageId = await sendMessage(conversationId, textToSend);
      setIsSent(true);
      onSend?.(messageId);
    } catch (error) {
      console.error("Error sending message:", error);

      let errorMessage = "Failed to send message";
      if (error instanceof Error) {
        if (error.message.includes("unauthenticated")) {
          errorMessage = "Please sign in to send messages";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "Network error. Please check your connection";
        } else if (error.message.includes("permission")) {
          errorMessage =
            "You don't have permission to send messages in this conversation";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleEdit = () => {
    onEdit?.();
  };

  return (
    <View style={styles.container}>
      {type === "translation" && (
        <>
          {/* Original Text */}
          {originalText && (
            <View style={styles.textSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="translate"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.sectionTitle}>
                  Original ({sourceLanguage || "auto-detected"})
                </Text>
              </View>
              <Text style={styles.textContent}>{originalText}</Text>
            </View>
          )}

          {/* Translated Text */}
          {translatedText && (
            <View style={styles.textSection}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="translate"
                  size={16}
                  color={theme.colors.amethystGlow}
                />
                <Text style={styles.sectionTitle}>
                  Translated ({targetLanguage})
                </Text>
              </View>
              <Text style={styles.textContent}>{translatedText}</Text>
            </View>
          )}
        </>
      )}

      {type === "generated_response" && generatedResponse && (
        <View style={styles.textSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={16}
              color={theme.colors.amethystGlow}
            />
            <Text style={styles.sectionTitle}>Generated Response</Text>
          </View>
          <Text style={styles.textContent}>{generatedResponse}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <MaterialCommunityIcons
            name="pencil"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        {isSent ? (
          <View style={styles.sentButton}>
            <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
            <Text style={styles.sentButtonText}>Sent</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size={16} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.sendButtonText}>
              {isSending ? "Sending..." : "Send"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.amethystGlow + "30",
  },
  textSection: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  textContent: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 22,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.amethystGlow,
  },
  sendButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  sentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: "#E8F5E8",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  sentButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#4CAF50",
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
