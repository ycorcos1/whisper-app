/**
 * Whisper Color Palette
 * Purple and silver aesthetic with dark/light mode support
 */

export const colors = {
  // Primary Colors
  deepTwilight: "#1B1325",
  silverMist: "#C9C9D1",
  amethystGlow: "#9C7AFF",
  lavenderHaze: "#C7B8FF",

  // Accent Colors
  royalPurple: "#7851A9",
  silverBlue: "#A0AEC0",
  softLilac: "#BBA0FF",
  lilacMist: "#C7B8FF",

  // Light Mode
  light: {
    background: "#F3F3F6", // Misty Silver
    text: "#1A1A1A", // Charcoal Gray
    textSecondary: "#666666",
    surface: "#FFFFFF",
    surfaceSecondary: "#FAFAFA",
    border: "#E0E0E0",
    accent: "#C7B8FF",
    accentSecondary: "#A0AEC0",
  },

  // Dark Mode
  dark: {
    background: "#1B1325", // Deep Twilight
    text: "#EAEAEA", // Warm White
    textSecondary: "#A0A0A0",
    surface: "#2A1F3D",
    surfaceSecondary: "#221833",
    border: "#3D2F54",
    accent: "#9C7AFF",
    accentSecondary: "#D4D4DC",
  },

  // Semantic Colors
  success: "#4CAF50",
  error: "#F44336",
  warning: "#FF9800",
  info: "#2196F3",

  // Message Status
  sending: "#A0AEC0",
  sent: "#9C7AFF",
  delivered: "#7851A9",
  read: "#4CAF50",

  // Glassmorphic Overlays
  glassLight: "rgba(255, 255, 255, 0.15)",
  glassDark: "rgba(43, 31, 61, 0.15)",
};

export type ThemeMode = "light" | "dark";

export const getThemeColors = (mode: ThemeMode) => ({
  ...colors,
  ...(mode === "light" ? colors.light : colors.dark),
});
