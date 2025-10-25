/**
 * Sources Component
 * Displays citation sources with tappable footnotes that jump to message
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { SearchResult } from "../../services/casperApi";

export interface SourcesProps {
  sources: SearchResult[];
  onSourceTap?: (messageId: string) => void;
  collapsed?: boolean;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Yesterday
  if (diffDays === 1) {
    return "Yesterday";
  }

  // Within a week
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  // Older
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + "...";
}

/**
 * Single source item
 */
const SourceItem: React.FC<{
  source: SearchResult;
  index: number;
  onTap?: (messageId: string) => void;
}> = ({ source, index, onTap }) => {
  const handleTap = () => {
    if (onTap) {
      onTap(source.metadata.mid);
    }
  };

  const timestamp = formatTimestamp(source.metadata.createdAt);
  const relevance = Math.round(source.score * 100);

  return (
    <TouchableOpacity
      style={styles.sourceItem}
      onPress={handleTap}
      disabled={!onTap}
      activeOpacity={0.7}
    >
      <View style={styles.sourceHeader}>
        <View style={styles.sourceNumber}>
          <Text style={styles.sourceNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceTimestamp}>{timestamp}</Text>
          <View style={styles.relevanceBadge}>
            <MaterialCommunityIcons
              name="seal-variant"
              size={12}
              color={theme.colors.amethystGlow}
            />
            <Text style={styles.relevanceText}>{relevance}%</Text>
          </View>
        </View>
        {onTap && (
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={theme.colors.textSecondary}
          />
        )}
      </View>
      <Text style={styles.sourceText} numberOfLines={3}>
        {truncate(source.metadata.text, 150)}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Sources list component
 */
export const Sources: React.FC<SourcesProps> = ({
  sources,
  onSourceTap,
  collapsed = false,
}) => {
  const [expanded, setExpanded] = React.useState(!collapsed);

  if (sources.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="link-variant"
          size={20}
          color={theme.colors.amethystGlow}
        />
        <Text style={styles.headerText}>
          {sources.length} Source{sources.length > 1 ? "s" : ""}
        </Text>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.sourcesList}>
          {sources.map((source, index) => (
            <SourceItem
              key={source.id}
              source={source}
              index={index}
              onTap={onSourceTap}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  headerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
  },
  sourcesList: {
    gap: 1,
  },
  sourceItem: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sourceNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.amethystGlow,
    justifyContent: "center",
    alignItems: "center",
  },
  sourceNumberText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#FFFFFF",
  },
  sourceInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  sourceTimestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  relevanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  relevanceText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.amethystGlow,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sourceText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
});
