/**
 * Casper Provider
 * Global provider for the Casper AI agent panel
 * Manages visibility, animation, context, and tab state
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Dimensions, Keyboard } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CasperTab,
  CasperContext as CasperContextType,
  CasperOpenOptions,
  CasperState,
} from "../types/agent";
import { CasperPanel } from "./CasperPanel";
import { CasperContextProvider } from "./CasperContext";
import { CasperContextAPI, CasperContextValue } from "./CasperRootContext";

const STORAGE_KEY = "agent:lastTab";

// moved to CasperRootContext to avoid require cycles

export const CasperProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<CasperState>({
    visible: false,
    activeTab: "Digest",
    context: {},
    source: null,
  });

  const heightAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Load last active tab on mount
  useEffect(() => {
    const loadLastTab = async () => {
      try {
        const lastTab = await AsyncStorage.getItem(STORAGE_KEY);
        if (lastTab && isValidTab(lastTab)) {
          setState((prev) => ({ ...prev, activeTab: lastTab as CasperTab }));
        }
      } catch (error) {
        console.error("Error loading last tab:", error);
      }
    };
    loadLastTab();
  }, []);

  // Helper to validate tab names
  const isValidTab = (tab: string): boolean => {
    return [
      "Ask",
      "Summary",
      "Actions",
      "Decisions",
      "Digest",
      "Planner",
    ].includes(tab);
  };

  // Open panel with optional configuration
  const open = useCallback(
    (opts: CasperOpenOptions) => {
      // Dismiss keyboard when opening Casper panel
      Keyboard.dismiss();

      // Stop any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Determine default tab based on source
      let defaultTab: CasperTab = "Digest";
      if (opts.defaultTab) {
        defaultTab = opts.defaultTab;
      } else if (opts.source === "conversations") {
        defaultTab = "Digest";
      } else if (opts.source === "chat") {
        defaultTab = "Ask";
      }

      // Update state
      setState({
        visible: true,
        activeTab: defaultTab,
        context: { cid: opts.cid },
        source: opts.source,
      });

      // Calculate target height (~65% of screen)
      const screenHeight = Dimensions.get("window").height;
      const targetHeight = Math.round(screenHeight * 0.75);

      // Animate panel open
      animationRef.current = Animated.spring(heightAnim, {
        toValue: targetHeight,
        useNativeDriver: false,
        damping: 20,
        mass: 0.8,
        stiffness: 120,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      });

      animationRef.current.start(({ finished }) => {
        if (finished) {
          animationRef.current = null;
        }
      });
    },
    [heightAnim]
  );

  // Close panel
  const close = useCallback(() => {
    // Dismiss keyboard when closing Casper panel
    Keyboard.dismiss();

    // Stop any ongoing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Animate panel close
    animationRef.current = Animated.spring(heightAnim, {
      toValue: 0,
      useNativeDriver: false,
      damping: 20,
      mass: 0.8,
      stiffness: 120,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        animationRef.current = null;
        setState((prev) => ({ ...prev, visible: false }));
      }
    });
  }, [heightAnim]);

  // Update context (e.g., when conversation changes)
  const setContext = useCallback((ctx: CasperContextType) => {
    setState((prev) => ({
      ...prev,
      context: { ...prev.context, ...ctx },
    }));
  }, []);

  // Change active tab
  const setActiveTab = useCallback(async (tab: CasperTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, tab);
    } catch (error) {
      console.error("Error saving last tab:", error);
    }
  }, []);

  const value: CasperContextValue = {
    state,
    heightAnim,
    open,
    close,
    setContext,
    setActiveTab,
  };

  return (
    <CasperContextAPI.Provider value={value}>
      <CasperContextProvider>
        {children}
        <CasperPanel />
      </CasperContextProvider>
    </CasperContextAPI.Provider>
  );
};
