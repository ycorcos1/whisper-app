/**
 * Casper AI Agent Types
 * Type definitions for the AI agent panel and features
 */

export type CasperTab =
  | "Ask"
  | "Summary"
  | "Actions"
  | "Decisions"
  | "Priority"
  | "Planner";

export type CasperSource = "conversations" | "chat";

export interface CasperContext {
  cid?: string; // Conversation ID
  loading?: boolean; // Loading state for current operation
  error?: string | null; // Error message if operation failed
}

export interface CasperOpenOptions {
  source: CasperSource;
  cid?: string;
  defaultTab?: CasperTab;
}

export interface CasperState {
  visible: boolean;
  activeTab: CasperTab;
  context: CasperContext;
  source: CasperSource | null;
}

/**
 * Rate Limiter for Ask Tab
 */
export interface RateLimiter {
  canProceed(): boolean;
  recordAttempt(): void;
  getRemainingAttempts(): number;
  reset(): void;
}

/**
 * Casper Panel Mode
 */
export type CasperMode = "normal" | "triage" | "digest";

/**
 * Feature Flags for Casper
 */
export interface CasperFeatureFlags {
  enableLLM: boolean;
  enableProactive: boolean;
  indexBatchSize: number;
  enableTranslator: boolean;
  translatorDefaultLanguage: string;
}
