/**
 * Banner Component
 * In-app notification banner that appears when new messages arrive
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";

export interface BannerProps {
  visible: boolean;
  title: string;
  message: string;
  onPress?: () => void;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const SWIPE_THRESHOLD = 50;

export function Banner({
  visible,
  title,
  message,
  onPress,
  onDismiss,
  autoDismissMs = 5000,
}: BannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pan responder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow horizontal and upward swipes
        if (gestureState.dy < 0 || Math.abs(gestureState.dx) > 10) {
          translateX.setValue(gestureState.dx);
          translateY.setValue(Math.min(gestureState.dy, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Dismiss if swiped up or far enough horizontally
        if (
          gestureState.dy < -SWIPE_THRESHOLD ||
          Math.abs(gestureState.dx) > SWIPE_THRESHOLD
        ) {
          handleDismiss();
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      console.log(
        "Banner becoming visible with title:",
        title,
        "message:",
        message
      );

      // Clear any existing timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Reset X position
      translateX.setValue(0);

      // Auto-dismiss after delay
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissMs);
    } else {
      console.log("Banner becoming invisible");
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [visible, title, message, autoDismissMs, translateY, translateX]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  };

  const handlePress = () => {
    handleDismiss();
    onPress?.();
  };

  if (!visible) {
    console.log("Banner not rendering - visible is false");
    return null;
  }

  console.log(
    "Banner rendering with visible=true, title:",
    title,
    "message:",
    message
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY }, { translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.indicatorLine} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: theme.spacing.md,
  },
  banner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    ...theme.shadows.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.amethystGlow,
  },
  indicatorLine: {
    position: "absolute",
    top: 8,
    left: "45%",
    right: "45%",
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    marginTop: 8,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  message: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight:
      theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
  },
  closeButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
});
