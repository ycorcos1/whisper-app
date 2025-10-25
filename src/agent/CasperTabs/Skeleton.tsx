/**
 * Skeleton Loading Components
 * Reusable skeleton loaders for Casper tabs
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { theme } from "../../theme";

/**
 * Animated skeleton shimmer effect
 */
const SkeletonBase: React.FC<{
  width: number | string;
  height: number;
  style?: any;
}> = ({ width, height, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[styles.skeletonBase, { width, height, opacity }, style]}
    />
  );
};

/**
 * Skeleton for insight cards (Summary, Actions, Decisions)
 */
export const InsightCardSkeleton: React.FC = () => {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <SkeletonBase width={80} height={16} />
        <SkeletonBase width={60} height={14} />
      </View>
      <SkeletonBase width="100%" height={14} style={{ marginTop: 8 }} />
      <SkeletonBase width="95%" height={14} style={{ marginTop: 6 }} />
      <SkeletonBase width="85%" height={14} style={{ marginTop: 6 }} />
    </View>
  );
};

/**
 * Skeleton for task items
 */
export const TaskItemSkeleton: React.FC = () => {
  return (
    <View style={styles.taskItem}>
      <SkeletonBase width={20} height={20} />
      <View style={styles.taskContent}>
        <SkeletonBase width="80%" height={16} />
        <SkeletonBase width="50%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

/**
 * Skeleton for digest content
 */
export const DigestSkeleton: React.FC = () => {
  return (
    <View style={styles.digestContainer}>
      <View style={styles.digestHeader}>
        <SkeletonBase width={120} height={20} />
        <SkeletonBase width={80} height={14} />
      </View>
      <View style={styles.digestSection}>
        <SkeletonBase width={100} height={16} />
        <SkeletonBase width="100%" height={14} style={{ marginTop: 8 }} />
        <SkeletonBase width="100%" height={14} style={{ marginTop: 6 }} />
        <SkeletonBase width="90%" height={14} style={{ marginTop: 6 }} />
      </View>
      <View style={styles.digestSection}>
        <SkeletonBase width={100} height={16} />
        <SkeletonBase width="100%" height={14} style={{ marginTop: 8 }} />
        <SkeletonBase width="85%" height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

/**
 * Generic list skeleton
 */
export const ListSkeleton: React.FC<{
  count?: number;
  itemComponent: React.FC;
}> = ({ count = 3, itemComponent: ItemComponent }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ItemComponent key={index} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  taskContent: {
    flex: 1,
  },
  digestContainer: {
    padding: theme.spacing.lg,
  },
  digestHeader: {
    marginBottom: theme.spacing.lg,
  },
  digestSection: {
    marginBottom: theme.spacing.lg,
  },
});
