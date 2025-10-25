/**
 * Casper Context
 * Provides shared state and utilities for Casper AI agent features
 * Includes loading/error state, feature flags, and rate limiting
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  CasperContext as CasperContextType,
  CasperMode,
  CasperFeatureFlags,
  RateLimiter,
} from "../types/agent";
import { featureFlags } from "../state/featureFlags";

interface CasperContextValue {
  context: CasperContextType;
  mode: CasperMode;
  flags: CasperFeatureFlags;
  rateLimiter: RateLimiter;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setMode: (mode: CasperMode) => void;
}

const CasperContext = createContext<CasperContextValue | undefined>(undefined);

/**
 * Simple in-memory rate limiter for Ask tab
 * Limits: 10 requests per minute
 */
class SimpleRateLimiter implements RateLimiter {
  private attempts: number[] = [];
  private readonly maxAttempts = 10;
  private readonly windowMs = 60 * 1000; // 1 minute

  canProceed(): boolean {
    this.cleanup();
    return this.attempts.length < this.maxAttempts;
  }

  recordAttempt(): void {
    this.attempts.push(Date.now());
  }

  getRemainingAttempts(): number {
    this.cleanup();
    return Math.max(0, this.maxAttempts - this.attempts.length);
  }

  reset(): void {
    this.attempts = [];
  }

  private cleanup(): void {
    const now = Date.now();
    this.attempts = this.attempts.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
  }
}

/**
 * Provider for Casper-specific context
 * Wraps the panel with shared state and utilities
 */
export const CasperContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [context, setContext] = useState<CasperContextType>({
    loading: false,
    error: null,
  });
  const [mode, setMode] = useState<CasperMode>("normal");

  // Initialize rate limiter
  const [rateLimiter] = useState(() => new SimpleRateLimiter());

  // Initialize feature flags
  const [flags] = useState<CasperFeatureFlags>({
    enableLLM: featureFlags.CASPER_ENABLE_LLM,
    enableProactive: featureFlags.CASPER_ENABLE_PROACTIVE,
    indexBatchSize: featureFlags.CASPER_INDEX_BATCH,
  });

  const setLoading = useCallback((loading: boolean) => {
    setContext((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setContext((prev) => ({ ...prev, error, loading: false }));
  }, []);

  const clearError = useCallback(() => {
    setContext((prev) => ({ ...prev, error: null }));
  }, []);

  const value: CasperContextValue = {
    context,
    mode,
    flags,
    rateLimiter,
    setLoading,
    setError,
    clearError,
    setMode,
  };

  return (
    <CasperContext.Provider value={value}>{children}</CasperContext.Provider>
  );
};

/**
 * Hook to access Casper context
 */
export const useCasperContext = () => {
  const context = useContext(CasperContext);
  if (!context) {
    throw new Error(
      "useCasperContext must be used within CasperContextProvider"
    );
  }
  return context;
};
