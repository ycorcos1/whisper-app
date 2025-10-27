/**
 * Actions Tab
 * Action items tab for the Casper AI agent
 * PR 6: Enhanced with rule-based extraction, pin, and mark done features
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
import { useActionItems } from "../hooks/useExtraction";
import { TaskItemSkeleton, ListSkeleton } from "./Skeleton";
import { clearActionCache } from "../utils/cacheUtils";

export const ActionsTab: React.FC = () => {
  const { state } = useCasper();
  const { actions, loading, error, refetch, togglePin, toggleDone } =
    useActionItems(state.context.cid);

  const [refreshing, setRefreshing] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [isReloading, setIsReloading] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache and force refresh
    await clearActionCache(state.context.cid || "");
    await refetch();
    setRefreshing(false);
  };

  const handleClearCache = async () => {
    setIsReloading(true);
    await clearActionCache(state.context.cid || "");
    await refetch();
    setIsReloading(false);
  };

  // Filter actions based on showHistory
  const filteredActions = React.useMemo(() => {
    if (!actions) return null;
    if (showHistory) {
      // History: only show done actions
      return actions.filter((action) => action.isDone);
    }
    // Active: only show pending actions
    return actions.filter((action) => !action.isDone);
  }, [actions, showHistory]);

  return (
    <View style={styles.container}>
      {/* Header with history toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {showHistory ? "Action History" : "Action Items"}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <MaterialCommunityIcons
              name={showHistory ? "arrow-left" : "history"}
              size={18}
              color={theme.colors.amethystGlow}
            />
            <Text style={styles.toggleButtonText}>
              {showHistory ? "Back" : "History"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleButton}
            onPress={handleClearCache}
            disabled={isReloading}
          >
            <MaterialCommunityIcons
              name={isReloading ? "loading" : "cached"}
              size={18}
              color={
                isReloading
                  ? theme.colors.amethystGlow
                  : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.toggleButtonText,
                {
                  color: isReloading
                    ? theme.colors.amethystGlow
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {isReloading ? "Reloading..." : "Reload"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && !filteredActions ? (
          <View style={styles.loadingContainer}>
            <ListSkeleton count={5} itemComponent={TaskItemSkeleton} />
          </View>
        ) : error ? (
          <View style={styles.errorState}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={64}
              color="#C62828"
            />
            <Text style={styles.errorTitle}>Error Loading Actions</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !filteredActions || filteredActions.length === 0 ? (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons
              name={showHistory ? "history" : "clipboard-check-outline"}
              size={48}
              color={
                showHistory
                  ? theme.colors.textSecondary
                  : theme.colors.amethystGlow
              }
            />
            <Text style={styles.placeholderText}>
              {showHistory ? "No History Yet" : "No Pending Actions"}
            </Text>
            <Text style={styles.placeholderSubtext}>
              {showHistory
                ? "You haven't completed any action items yet."
                : state.context.cid
                ? actions && actions.length > 0
                  ? `All ${actions.length} action items completed! Check History to see them.`
                  : "Action items from this conversation will appear here."
                : actions && actions.length > 0
                ? `All ${actions.length} action items completed! Check History to see them.`
                : "Action items from all your conversations will appear here."}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredActions && filteredActions.length > 0 && (
              <Text style={styles.sectionTitle}>
                {showHistory ? "📜 " : "✓ "}
                {showHistory ? "Completed Actions" : "Action Items"} (
                {filteredActions.length})
              </Text>
            )}

            {filteredActions.map((action) => (
              <View
                key={`action_${action.mid}_${
                  action.timestamp
                }_${action.title.slice(0, 10)}`}
                style={styles.actionCard}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.actionCheckbox,
                    action.isDone && styles.actionCheckboxDone,
                  ]}
                  onPress={() => toggleDone(action.mid)}
                >
                  {action.isDone && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>

                <View style={styles.actionContent}>
                  <Text
                    style={[
                      styles.actionTitle,
                      action.isDone && styles.actionTitleDone,
                    ]}
                  >
                    {action.title}
                  </Text>

                  <View style={styles.actionMeta}>
                    {action.due && (
                      <View style={styles.actionMetaItem}>
                        <MaterialCommunityIcons
                          name="calendar-outline"
                          size={12}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.actionMetaText}>{action.due}</Text>
                      </View>
                    )}
                    {action.assignee && (
                      <View style={styles.actionMetaItem}>
                        <MaterialCommunityIcons
                          name="account-outline"
                          size={12}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={styles.actionMetaText}>
                          @{action.assignee}
                        </Text>
                      </View>
                    )}
                    <View style={styles.actionMetaItem}>
                      <MaterialCommunityIcons
                        name="chart-line"
                        size={12}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.actionMetaText}>
                        {Math.round(action.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pin button */}
                <TouchableOpacity
                  style={styles.pinButton}
                  onPress={() => togglePin(action.mid)}
                >
                  <MaterialCommunityIcons
                    name={action.isPinned ? "pin" : "pin-outline"}
                    size={20}
                    color={
                      action.isPinned
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  toggleButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.medium,
  },
  scrollView: {
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
  actionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  actionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCheckboxDone: {
    backgroundColor: theme.colors.amethystGlow,
    borderColor: theme.colors.amethystGlow,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium,
  },
  actionTitleDone: {
    textDecorationLine: "line-through",
    color: theme.colors.textSecondary,
  },
  actionMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  actionMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionMetaText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  pinButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
});
