/**
 * Decisions Tab
 * Decisions log tab for the Casper AI agent
 * PR 6: Enhanced with rule-based extraction and pin features
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { useCasper } from "../useCasper";
import { useDecisionLog } from "../hooks/useExtraction";
import { InsightCardSkeleton, ListSkeleton } from "./Skeleton";
import { clearDecisionCache } from "../utils/cacheUtils";

export const DecisionsTab: React.FC = () => {
  const { state } = useCasper();
  const { decisions, loading, error, refetch, togglePin } = useDecisionLog(
    state.context.cid
  );

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache and force refresh
    await clearDecisionCache(state.context.cid || "");
    await refetch();
    setRefreshing(false);
  };

  // Helper to format timestamp
  const formatDate = (timestamp: number): string => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
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
      {loading && !decisions ? (
        <View style={styles.loadingContainer}>
          <ListSkeleton count={3} itemComponent={InsightCardSkeleton} />
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color="#C62828"
          />
          <Text style={styles.errorTitle}>Error Loading Decisions</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !decisions || decisions.length === 0 ? (
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="lightbulb-on-outline"
            size={48}
            color={theme.colors.amethystGlow}
          />
          <Text style={styles.placeholderText}>No decisions yet</Text>
          <Text style={styles.placeholderSubtext}>
            {state.context.cid
              ? "Final decisions and agreements from this conversation will appear here."
              : "Final decisions and agreements from all your conversations will appear here."}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {decisions.map((decision) => (
            <View
              key={`decision_${decision.mid}_${
                decision.timestamp
              }_${decision.content.slice(0, 10)}`}
              style={styles.decisionCard}
            >
              <View style={styles.decisionMain}>
                <View style={styles.decisionHeader}>
                  <MaterialCommunityIcons
                    name="lightbulb-on-outline"
                    size={20}
                    color={theme.colors.amethystGlow}
                  />
                  <Text style={styles.decisionDate}>
                    {formatDate(decision.timestamp)}
                  </Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(decision.confidence * 100)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.decisionContent}>{decision.content}</Text>
              </View>

              {/* Pin button */}
              <TouchableOpacity
                style={styles.pinButton}
                onPress={() => togglePin(decision.mid)}
              >
                <MaterialCommunityIcons
                  name={decision.isPinned ? "pin" : "pin-outline"}
                  size={20}
                  color={
                    decision.isPinned
                      ? theme.colors.amethystGlow
                      : theme.colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
  decisionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  decisionMain: {
    flex: 1,
  },
  decisionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  decisionDate: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.amethystGlow + "20",
  },
  confidenceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  decisionContent: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    lineHeight: 20,
  },
  pinButton: {
    padding: 4,
  },
});
