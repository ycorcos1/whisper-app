/**
 * Feature Flags
 * Centralized feature flag management for the Whisper app
 * Includes Casper AI agent feature flags
 */

import Constants from "expo-constants";

// Environment variable defaults
const DEFAULT_FLAGS = {
  // Casper AI Agent Flags
  CASPER_ENABLE_LLM: false, // Enable LLM integration (OpenAI, Anthropic, etc.)
  CASPER_ENABLE_PROACTIVE: true, // Enable proactive suggestions and notifications
  CASPER_INDEX_BATCH: 200, // Number of messages to batch when indexing
};

/**
 * Get feature flag value from environment or default
 */
function getEnvFlag<T extends string | number | boolean>(
  key: string,
  defaultValue: T
): T {
  try {
    // Read from Expo Constants (app.config.ts extra)
    const env = Constants.expoConfig?.extra || {};
    const envValue = env[key];

    if (envValue === undefined || envValue === null) {
      return defaultValue;
    }

    // Type conversion based on default value type
    if (typeof defaultValue === "boolean") {
      return (envValue === "true" ||
        envValue === "1" ||
        envValue === true) as T;
    }

    if (typeof defaultValue === "number") {
      const parsed =
        typeof envValue === "number" ? envValue : parseInt(envValue, 10);
      return (isNaN(parsed) ? defaultValue : parsed) as T;
    }

    return envValue as T;
  } catch (error) {
    console.warn(`Error reading env flag ${key}, using default:`, error);
    return defaultValue;
  }
}

/**
 * Feature flags object
 * Access flags via: featureFlags.CASPER_ENABLE_LLM
 */
export const featureFlags = {
  // Casper AI Agent
  CASPER_ENABLE_LLM: getEnvFlag(
    "CASPER_ENABLE_LLM",
    DEFAULT_FLAGS.CASPER_ENABLE_LLM
  ),
  CASPER_ENABLE_PROACTIVE: getEnvFlag(
    "CASPER_ENABLE_PROACTIVE",
    DEFAULT_FLAGS.CASPER_ENABLE_PROACTIVE
  ),
  CASPER_INDEX_BATCH: getEnvFlag(
    "CASPER_INDEX_BATCH",
    DEFAULT_FLAGS.CASPER_INDEX_BATCH
  ),
} as const;

/**
 * Type for feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const value = featureFlags[key];
  return Boolean(value);
}

/**
 * Get feature flag value
 */
export function getFeatureFlag<K extends FeatureFlagKey>(
  key: K
): (typeof featureFlags)[K] {
  return featureFlags[key];
}
