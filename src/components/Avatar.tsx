/**
 * Avatar Component
 * Displays user avatar with circle crop and initials fallback
 */

import React from "react";
import { View, Text, Image, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../theme";
import { generateInitials, generateAvatarColor } from "../lib/avatarUtils";

export interface AvatarProps {
  /** User's photo URL */
  photoURL?: string | null;
  /** User's display name (for initials fallback) */
  displayName: string;
  /** User's ID (for consistent color generation) */
  userId: string;
  /** Size of the avatar */
  size?: "small" | "medium" | "large" | "xl";
  /** Custom style */
  style?: ViewStyle;
  /** Show online indicator */
  showOnline?: boolean;
  /** Is user online */
  isOnline?: boolean;
}

const SIZES = {
  small: 32,
  medium: 40,
  large: 60,
  xl: 100,
};

const FONT_SIZES = {
  small: 14,
  medium: 16,
  large: 24,
  xl: 36,
};

export function Avatar({
  photoURL,
  displayName,
  userId,
  size = "medium",
  style,
  showOnline = false,
  isOnline = false,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  // Reset error and loading state when photoURL changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoading(true);
  }, [photoURL]);

  const avatarSize = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const initials = generateInitials(displayName);
  const backgroundColor = generateAvatarColor(userId);

  // Show initials if no photo URL, image failed to load, or is loading
  const showInitials = !photoURL || imageError || imageLoading;

  return (
    <View
      style={[
        styles.container,
        { width: avatarSize, height: avatarSize },
        style,
      ]}
    >
      {showInitials ? (
        <View
          style={[
            styles.initialsContainer,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: photoURL }}
          style={[
            styles.image,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
            },
          ]}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
      )}

      {/* Online indicator */}
      {showOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: avatarSize * 0.2,
              height: avatarSize * 0.2,
              borderRadius: avatarSize * 0.1,
              borderWidth: avatarSize * 0.03,
            },
            isOnline
              ? styles.onlineIndicatorActive
              : styles.onlineIndicatorInactive,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  initialsContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: theme.typography.fontWeight.bold,
  },
  image: {
    backgroundColor: theme.colors.surface,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderColor: theme.colors.background,
  },
  onlineIndicatorActive: {
    backgroundColor: theme.colors.success,
  },
  onlineIndicatorInactive: {
    backgroundColor: theme.colors.border,
  },
});
