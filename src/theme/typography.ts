/**
 * Whisper Typography System
 * Based on Inter/Satoshi font family with consistent scale
 */

export const typography = {
  // Font Families
  fontFamily: {
    regular: "System", // Will use Inter/San Francisco on iOS, Roboto on Android
    medium: "System",
    semibold: "System",
    bold: "System",
  },

  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },

  // Font Weights
  fontWeight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

export const textStyles = {
  h1: {
    fontSize: typography.fontSize["3xl"],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize["3xl"] * typography.lineHeight.tight,
  },
  h2: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.fontSize["2xl"] * typography.lineHeight.tight,
  },
  h3: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  bodyMedium: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  small: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
};
