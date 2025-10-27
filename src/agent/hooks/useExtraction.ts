/**
 * Action Items and Decision Hooks
 * React hooks for managing action items and decisions with local pin/done state
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ExtractedAction,
  extractActions,
  extractActionsGlobal,
} from "../extract/actions";
import {
  ExtractedDecision,
  extractDecisions,
  extractDecisionsGlobal,
} from "../extract/decisions";
import { useAuth } from "../../state/auth/useAuth";

// Local state storage keys
const PINNED_ACTIONS_KEY = "casper:pinned_actions";
const DONE_ACTIONS_KEY = "casper:done_actions";
const PINNED_DECISIONS_KEY = "casper:pinned_decisions";
const DONE_DECISIONS_KEY = "casper:done_decisions";

export interface ActionItemWithState extends ExtractedAction {
  isPinned: boolean;
  isDone: boolean;
}

export interface DecisionWithState extends ExtractedDecision {
  isPinned: boolean;
  isDone: boolean;
}

interface UseActionItemsResult {
  actions: ActionItemWithState[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  togglePin: (mid: string) => Promise<void>;
  toggleDone: (mid: string) => Promise<void>;
}

interface UseDecisionLogResult {
  decisions: DecisionWithState[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  togglePin: (mid: string) => Promise<void>;
  toggleDone: (mid: string) => Promise<void>;
}

/**
 * Load pinned/done state from local storage
 */
async function loadActionState(): Promise<{
  pinned: Set<string>;
  done: Set<string>;
}> {
  try {
    const [pinnedStr, doneStr] = await Promise.all([
      AsyncStorage.getItem(PINNED_ACTIONS_KEY),
      AsyncStorage.getItem(DONE_ACTIONS_KEY),
    ]);

    return {
      pinned: new Set(pinnedStr ? JSON.parse(pinnedStr) : []),
      done: new Set(doneStr ? JSON.parse(doneStr) : []),
    };
  } catch (error) {
    console.warn("Error loading action state:", error);
    return { pinned: new Set(), done: new Set() };
  }
}

/**
 * Save pinned state to local storage
 */
async function savePinnedActions(pinned: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(PINNED_ACTIONS_KEY, JSON.stringify([...pinned]));
  } catch (error) {
    console.warn("Error saving pinned actions:", error);
  }
}

/**
 * Save done state to local storage
 */
async function saveDoneActions(done: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_ACTIONS_KEY, JSON.stringify([...done]));
  } catch (error) {
    console.warn("Error saving done actions:", error);
  }
}

/**
 * Load pinned decisions from local storage
 */
async function loadPinnedDecisions(): Promise<Set<string>> {
  try {
    const pinnedStr = await AsyncStorage.getItem(PINNED_DECISIONS_KEY);
    return new Set(pinnedStr ? JSON.parse(pinnedStr) : []);
  } catch (error) {
    console.warn("Error loading pinned decisions:", error);
    return new Set();
  }
}

/**
 * Save pinned decisions to local storage
 */
async function savePinnedDecisions(pinned: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PINNED_DECISIONS_KEY,
      JSON.stringify([...pinned])
    );
  } catch (error) {
    console.warn("Error saving pinned decisions:", error);
  }
}

/**
 * Load done decisions from local storage
 */
async function loadDoneDecisions(): Promise<Set<string>> {
  try {
    const doneStr = await AsyncStorage.getItem(DONE_DECISIONS_KEY);
    return new Set(doneStr ? JSON.parse(doneStr) : []);
  } catch (error) {
    console.warn("Error loading done decisions:", error);
    return new Set();
  }
}

/**
 * Save done decisions to local storage
 */
async function saveDoneDecisions(done: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(DONE_DECISIONS_KEY, JSON.stringify([...done]));
  } catch (error) {
    console.warn("Error saving done decisions:", error);
  }
}

/**
 * Hook to manage action items with pin/done state
 */
export function useActionItems(cid?: string): UseActionItemsResult {
  const [actions, setActions] = useState<ActionItemWithState[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(new Set());
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const { firebaseUser } = useAuth();

  const refetch = useCallback(async () => {
    // console.log("useActionItems refetch called, cid:", cid);
    setLoading(true);
    setError(null);

    try {
      // Load local state
      const state = await loadActionState();
      setPinnedSet(state.pinned);
      setDoneSet(state.done);
      // console.log("Loaded pinned actions:", state.pinned.size);

      // Extract actions - use global if no conversation context
      let extractedActions: ExtractedAction[];
      if (cid) {
        // console.log("Extracting actions for conversation:", cid);
        extractedActions = await extractActions(cid);
      } else if (firebaseUser?.uid) {
        // console.log("Extracting global actions for user:", firebaseUser.uid);
        extractedActions = await extractActionsGlobal(firebaseUser.uid);
      } else {
        // console.log("No conversation context or user, setting actions to null");
        setActions(null);
        setLoading(false);
        return;
      }

      // console.log("Extracted actions:", extractedActions.length);

      // Merge with local state
      const actionsWithState: ActionItemWithState[] = extractedActions.map(
        (action) => ({
          ...action,
          isPinned: state.pinned.has(action.mid),
          isDone: state.done.has(action.mid),
        })
      );

      // Sort: pinned first, then by confidence, then by timestamp
      actionsWithState.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        return b.timestamp - a.timestamp;
      });

      setActions(actionsWithState);
      // console.log("Final actions with state:", actionsWithState.length);
    } catch (err: any) {
      console.error("Error fetching actions:", err);
      setError(err.message || "Failed to load actions");
    } finally {
      setLoading(false);
    }
  }, [cid, firebaseUser?.uid]);

  const togglePin = useCallback(
    async (mid: string) => {
      const newPinned = new Set(pinnedSet);
      if (newPinned.has(mid)) {
        newPinned.delete(mid);
      } else {
        newPinned.add(mid);
      }

      setPinnedSet(newPinned);
      await savePinnedActions(newPinned);

      // Update local state
      if (actions) {
        const updated = actions.map((action) =>
          action.mid === mid
            ? { ...action, isPinned: newPinned.has(mid) }
            : action
        );

        // Re-sort after pin change
        updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
          }
          if (Math.abs(a.confidence - b.confidence) > 0.1) {
            return b.confidence - a.confidence;
          }
          return b.timestamp - a.timestamp;
        });

        setActions(updated);
      }
    },
    [actions, pinnedSet]
  );

  const toggleDone = useCallback(
    async (mid: string) => {
      const newDone = new Set(doneSet);
      if (newDone.has(mid)) {
        newDone.delete(mid);
      } else {
        newDone.add(mid);
      }

      setDoneSet(newDone);
      await saveDoneActions(newDone);

      // Update local state
      if (actions) {
        const updated = actions.map((action) =>
          action.mid === mid ? { ...action, isDone: newDone.has(mid) } : action
        );
        setActions(updated);
      }
    },
    [actions, doneSet]
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { actions, loading, error, refetch, togglePin, toggleDone };
}

/**
 * Hook to manage decisions with pin/done state
 */
export function useDecisionLog(cid?: string): UseDecisionLogResult {
  const [decisions, setDecisions] = useState<DecisionWithState[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(new Set());
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());
  const { firebaseUser } = useAuth();

  const refetch = useCallback(async () => {
    // console.log("useDecisionLog refetch called, cid:", cid);
    setLoading(true);
    setError(null);

    try {
      // Load local state (both pinned and done)
      const [pinned, done] = await Promise.all([
        loadPinnedDecisions(),
        loadDoneDecisions(),
      ]);
      setPinnedSet(pinned);
      setDoneSet(done);
      // console.log("Loaded pinned decisions:", pinned.size, "done:", done.size);

      // Extract decisions - use global if no conversation context
      let extractedDecisions: ExtractedDecision[];
      if (cid) {
        // console.log("Extracting decisions for conversation:", cid);
        extractedDecisions = await extractDecisions(cid);
      } else if (firebaseUser?.uid) {
        // console.log("Extracting global decisions for user:", firebaseUser.uid);
        extractedDecisions = await extractDecisionsGlobal(firebaseUser.uid);
      } else {
        // console.log(
        //   "No conversation context or user, setting decisions to null"
        // );
        setDecisions(null);
        setLoading(false);
        return;
      }

      // console.log("Extracted decisions:", extractedDecisions.length);

      // Merge with local state (both pinned and done)
      const decisionsWithState: DecisionWithState[] = extractedDecisions.map(
        (decision) => ({
          ...decision,
          isPinned: pinned.has(decision.mid),
          isDone: done.has(decision.mid),
        })
      );

      // Sort: pinned first, then by confidence, then by timestamp
      decisionsWithState.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        if (Math.abs(a.confidence - b.confidence) > 0.05) {
          return b.confidence - a.confidence;
        }
        return b.timestamp - a.timestamp;
      });

      // console.log("Final decisions with state:", decisionsWithState.length);
      setDecisions(decisionsWithState);
    } catch (err: any) {
      console.error("Error fetching decisions:", err);
      setError(err.message || "Failed to load decisions");
    } finally {
      setLoading(false);
    }
  }, [cid, firebaseUser?.uid]);

  const togglePin = useCallback(
    async (mid: string) => {
      const newPinned = new Set(pinnedSet);
      if (newPinned.has(mid)) {
        newPinned.delete(mid);
      } else {
        newPinned.add(mid);
      }

      setPinnedSet(newPinned);
      await savePinnedDecisions(newPinned);

      // Update local state
      if (decisions) {
        const updated = decisions.map((decision) =>
          decision.mid === mid
            ? { ...decision, isPinned: newPinned.has(mid) }
            : decision
        );

        // Re-sort after pin change
        updated.sort((a, b) => {
          if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
          }
          if (Math.abs(a.confidence - b.confidence) > 0.05) {
            return b.confidence - a.confidence;
          }
          return b.timestamp - a.timestamp;
        });

        setDecisions(updated);
      }
    },
    [decisions, pinnedSet]
  );

  const toggleDone = useCallback(
    async (mid: string) => {
      const newDone = new Set(doneSet);
      if (newDone.has(mid)) {
        newDone.delete(mid);
      } else {
        newDone.add(mid);
      }

      setDoneSet(newDone);
      await saveDoneDecisions(newDone);

      // Update local state
      if (decisions) {
        const updated = decisions.map((decision) =>
          decision.mid === mid
            ? { ...decision, isDone: newDone.has(mid) }
            : decision
        );
        setDecisions(updated);
      }
    },
    [decisions, doneSet]
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { decisions, loading, error, refetch, togglePin, toggleDone };
}
