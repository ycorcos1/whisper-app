/**
 * Notification Banner Wrapper
 * Manages banner display and navigation for in-app notifications
 */

import React from "react";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Banner } from "./Banner";
import { useNotifications } from "../state/NotificationContext";
import type { RootStackParamList } from "../navigation/types";

export function NotificationBanner() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { currentNotification, dismissNotification } = useNotifications();

  // console.log(
  //   "NotificationBanner render - currentNotification:",
  //   currentNotification
  // );

  const handlePress = () => {
    if (!currentNotification) return;

    // Navigate to the chat
    navigation.navigate("Chat", {
      conversationId: currentNotification.conversationId,
      conversationName: currentNotification.conversationName,
    });

    dismissNotification();
  };

  return (
    <Banner
      visible={currentNotification !== null}
      title={currentNotification?.conversationName || ""}
      message={currentNotification?.message || ""}
      onPress={handlePress}
      onDismiss={dismissNotification}
    />
  );
}
