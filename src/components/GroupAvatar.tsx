/**
 * GroupAvatar Component
 * Displays multiple user avatars in a circular cluster for group chats
 */

import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Avatar } from "./Avatar";
import { theme } from "../theme";

export interface GroupAvatarProps {
  /** Member information for avatar display (max 4) */
  members: Array<{
    userId: string;
    displayName: string;
    photoURL?: string | null;
  }>;
  /** Size of the group avatar container */
  size?: "small" | "medium" | "large";
  /** Custom style */
  style?: ViewStyle;
}

const CONTAINER_SIZES = {
  small: 32,
  medium: 40,
  large: 60,
};

const AVATAR_SIZES = {
  small: "small" as const,
  medium: "small" as const,
  large: "medium" as const,
};

export function GroupAvatar({
  members,
  size = "medium",
  style,
}: GroupAvatarProps) {
  // Show up to 4 members
  const displayMembers = members.slice(0, 4);
  const containerSize = CONTAINER_SIZES[size];
  const avatarSize = AVATAR_SIZES[size];

  // Position avatars based on count
  const getAvatarStyle = (index: number, total: number) => {
    const avatarSizePixels = CONTAINER_SIZES[avatarSize];
    const offset = avatarSizePixels * 0.25; // Overlap amount

    if (total === 1) {
      return {};
    }

    if (total === 2) {
      // Side by side, slightly overlapping
      return {
        position: "absolute" as const,
        left: index === 0 ? 0 : containerSize - avatarSizePixels + offset,
        top: (containerSize - avatarSizePixels) / 2,
      };
    }

    if (total === 3) {
      // Triangle formation: one top, two bottom
      if (index === 0) {
        // Top center
        return {
          position: "absolute" as const,
          left: (containerSize - avatarSizePixels) / 2,
          top: 0,
        };
      }
      // Bottom left and right
      return {
        position: "absolute" as const,
        left: index === 1 ? offset : containerSize - avatarSizePixels - offset,
        top: containerSize - avatarSizePixels,
      };
    }

    // 4 members: arranged in a 2x2 grid
    return {
      position: "absolute" as const,
      left:
        index % 2 === 0 ? offset : containerSize - avatarSizePixels - offset,
      top: index < 2 ? offset : containerSize - avatarSizePixels - offset,
    };
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: containerSize / 2,
        },
        style,
      ]}
    >
      {displayMembers.map((member, index) => (
        <View
          key={member.userId}
          style={[
            getAvatarStyle(index, displayMembers.length),
            styles.avatarWrapper,
          ]}
        >
          <Avatar
            photoURL={member.photoURL}
            displayName={member.displayName}
            userId={member.userId}
            size={avatarSize}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: theme.colors.background,
  },
  avatarWrapper: {
    borderWidth: 1.5,
    borderColor: theme.colors.background,
    borderRadius: 100,
    overflow: "hidden",
  },
});
