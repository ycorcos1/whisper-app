/**
 * Keyboard handling utilities for consistent behavior across the app
 */

import { Platform } from "react-native";

// Standard navigation and UI element heights
const STANDARD_HEIGHTS = {
  navigationBar: Platform.OS === "ios" ? 44 : 56,
  statusBar: Platform.OS === "ios" ? 44 : 24,
  tabBar: 50,
  casperPanelHeader: 60,
  casperTabBar: 50,
  inputComposer: 60,
};

/**
 * Calculate keyboard vertical offset based on UI elements
 */
export const calculateKeyboardOffset = (options: {
  hasNavigationBar?: boolean;
  hasTabBar?: boolean;
  hasCasperPanel?: boolean;
  customOffset?: number;
}): number => {
  const {
    hasNavigationBar = false,
    hasTabBar = false,
    hasCasperPanel = false,
    customOffset = 0,
  } = options;

  let offset = customOffset;

  // Add navigation bar height if present
  if (hasNavigationBar) {
    offset += STANDARD_HEIGHTS.navigationBar;
  }

  // Add tab bar height if present
  if (hasTabBar) {
    offset += STANDARD_HEIGHTS.tabBar;
  }

  // Add Casper panel specific heights
  if (hasCasperPanel) {
    offset +=
      STANDARD_HEIGHTS.casperPanelHeader + STANDARD_HEIGHTS.casperTabBar;
  }

  return offset;
};

/**
 * Get platform-specific keyboard avoiding behavior
 */
export const getKeyboardBehavior = () => {
  return Platform.OS === "ios" ? "padding" : "height";
};

/**
 * Calculate Casper panel keyboard offset dynamically
 */
export const getCasperKeyboardOffset = (): number => {
  // Casper panel has significant UI above the input:
  // - Panel header (~60px)
  // - Tab bar (~50px)
  // - Content padding and spacing (~40px)
  // - Input field itself (~60px)
  // Total UI height above keyboard: ~210px

  const baseOffset = Platform.OS === "ios" ? 310 : 150;

  return baseOffset;
};

/**
 * Get standard keyboard offset for chat screens
 */
export const getChatKeyboardOffset = (): number => {
  return calculateKeyboardOffset({
    hasNavigationBar: true,
    customOffset: Platform.OS === "ios" ? 55 : 0,
  });
};

/**
 * Get keyboard offset for auth screens
 */
export const getAuthKeyboardOffset = (): number => {
  return calculateKeyboardOffset({
    hasNavigationBar: true,
    customOffset: Platform.OS === "ios" ? 10 : 0,
  });
};

/**
 * Get keyboard offset for new chat screens
 */
export const getNewChatKeyboardOffset = (): number => {
  return calculateKeyboardOffset({
    hasNavigationBar: true,
    hasTabBar: true,
    customOffset: Platform.OS === "ios" ? 20 : 0,
  });
};
