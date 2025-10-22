/**
 * Whisper Design System
 * Main theme export combining colors, typography, spacing, and utilities
 */

import { colors, getThemeColors, ThemeMode } from "./colors";
import { typography, textStyles } from "./typography";
import { spacing, borderRadius, shadows } from "./spacing";

export interface Theme {
  colors: ReturnType<typeof getThemeColors>;
  typography: typeof typography;
  textStyles: typeof textStyles;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  mode: ThemeMode;
}

export const createTheme = (mode: ThemeMode = "dark"): Theme => ({
  colors: getThemeColors(mode),
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  mode,
});

// Default export with dark theme
export const theme = createTheme("dark");

// Re-export individual modules for convenience
export { colors, typography, spacing, borderRadius, shadows };
export type { ThemeMode };
