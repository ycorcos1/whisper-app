/**
 * Summary Tab
 * Conversation summary tab for the Casper AI agent
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useCasper } from "../useCasper";
import { generateConversationSummary, ConversationSummary } from "../summarize";

type SummaryTimeframe = "24h" | "7d" | "all";

export const SummaryTab: React.FC = () => {
  const { state } = useCasper();
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<SummaryTimeframe | null>(null);

  const handleGenerateSummary = async (
    timeframe: SummaryTimeframe,
    length: "short" | "normal" | "long" = "normal"
  ) => {
    if (!state.context.cid) return;

    setLoading(true);
    setError(null);
    setSelectedTimeframe(timeframe);

    try {
      // Map timeframe to focus query
      const focusQuery =
        timeframe === "24h"
          ? "messages from last 24 hours"
          : timeframe === "7d"
          ? "messages from last 7 days"
          : "all messages and decisions";

      const result = await generateConversationSummary(
        state.context.cid,
        focusQuery,
        length,
        true // Force refresh
      );

      setSummary(result);
    } catch (err) {
      console.error("Error generating summary:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedTimeframe || !state.context.cid) return;

    setRefreshing(true);
    await handleGenerateSummary(selectedTimeframe);
    setRefreshing(false);
  };

  const handleCopyToClipboard = async () => {
    if (!summary) return;

    try {
      await Clipboard.setStringAsync(summary.content);
      Alert.alert("Copied!", "Summary copied to clipboard");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {!state.context.cid ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="text-box-outline"
            size={64}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.emptyText}>Pick a conversation</Text>
          <Text style={styles.emptySubtext}>
            Open a conversation to see its summary
          </Text>
        </View>
      ) : (
        <>
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                selectedTimeframe === "24h" && styles.actionButtonActive,
              ]}
              onPress={() => handleGenerateSummary("24h")}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={
                  selectedTimeframe === "24h"
                    ? "#FFFFFF"
                    : theme.colors.amethystGlow
                }
              />
              <Text
                style={[
                  styles.actionButtonText,
                  selectedTimeframe === "24h" && styles.actionButtonTextActive,
                ]}
              >
                Last 24h
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                selectedTimeframe === "7d" && styles.actionButtonActive,
              ]}
              onPress={() => handleGenerateSummary("7d")}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="calendar-week"
                size={20}
                color={
                  selectedTimeframe === "7d"
                    ? "#FFFFFF"
                    : theme.colors.amethystGlow
                }
              />
              <Text
                style={[
                  styles.actionButtonText,
                  selectedTimeframe === "7d" && styles.actionButtonTextActive,
                ]}
              >
                Last 7d
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                selectedTimeframe === "all" && styles.actionButtonActive,
              ]}
              onPress={() => handleGenerateSummary("all")}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name="text-box-multiple"
                size={20}
                color={
                  selectedTimeframe === "all"
                    ? "#FFFFFF"
                    : theme.colors.amethystGlow
                }
              />
              <Text
                style={[
                  styles.actionButtonText,
                  selectedTimeframe === "all" && styles.actionButtonTextActive,
                ]}
              >
                All Time
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingState}>
              <ActivityIndicator
                size="large"
                color={theme.colors.amethystGlow}
              />
              <Text style={styles.loadingText}>Generating summary...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorState}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={64}
                color="#C62828"
              />
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() =>
                  selectedTimeframe && handleGenerateSummary(selectedTimeframe)
                }
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Summary Content */}
          {summary && !loading && (
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <MaterialCommunityIcons
                    name="text-box-outline"
                    size={20}
                    color={theme.colors.amethystGlow}
                  />
                  <Text style={styles.summaryDate}>
                    {new Date(summary.createdAt).toLocaleString()}
                  </Text>
                  <View style={styles.modeBadge}>
                    <MaterialCommunityIcons
                      name={
                        summary.mode === "llm"
                          ? "brain"
                          : "file-document-outline"
                      }
                      size={12}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.modeText}>
                      {summary.mode === "llm" ? "AI" : "Template"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.summaryContent}>{summary.content}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.bottomActions}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleCopyToClipboard}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={20}
                    color={theme.colors.amethystGlow}
                  />
                  <Text style={styles.iconButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Placeholder */}
          {!summary && !loading && !error && (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={48}
                color={theme.colors.amethystGlow}
              />
              <Text style={styles.placeholderText}>No summary yet</Text>
              <Text style={styles.placeholderSubtext}>
                Choose a timeframe above to generate a conversation summary
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  loadingContainer: {
    padding: theme.spacing.lg,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#C62828",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.amethystGlow,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  placeholderText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  placeholderSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  listContainer: {
    padding: theme.spacing.lg,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  summaryDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  summaryContent: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  timeWindow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  timeWindowText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.amethystGlow,
    backgroundColor: theme.colors.surface,
  },
  actionButtonActive: {
    backgroundColor: theme.colors.amethystGlow,
  },
  actionButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.amethystGlow,
  },
  actionButtonTextActive: {
    color: "#FFFFFF",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  summaryContainer: {
    padding: theme.spacing.lg,
    paddingTop: 0,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  modeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  bottomActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  iconButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.amethystGlow,
  },
});
