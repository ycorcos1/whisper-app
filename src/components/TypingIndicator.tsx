/**
 * Typing Indicator Component
 * Shows animated dots when users are typing
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { theme } from "../theme";

interface TypingIndicatorProps {
  isTyping: boolean;
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isTyping,
  userName,
}) => {
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isTyping) {
      const animate = () => {
        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(dot1Opacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot2Opacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot3Opacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          if (isTyping) {
            animate();
          }
        });
      };
      animate();
    } else {
      // Reset to default opacity
      dot1Opacity.setValue(0.3);
      dot2Opacity.setValue(0.3);
      dot3Opacity.setValue(0.3);
    }
  }, [isTyping, dot1Opacity, dot2Opacity, dot3Opacity]);

  if (!isTyping) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {userName && (
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
        )}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignSelf: "flex-start",
  },
  userName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
    fontStyle: "italic",
    maxWidth: 120,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.amethystGlow,
  },
});

