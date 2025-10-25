/**
 * LLM Enhancement Module
 * Optional LLM-based rewriting/refinement of extracted actions and decisions
 * Only active when CASPER_ENABLE_LLM is true
 */

import { featureFlags } from "../../state/featureFlags";
import { ExtractedAction } from "./actions";
import { ExtractedDecision } from "./decisions";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "../../lib/firebase";

const functions = getFunctions(firebaseApp);

export interface RefinedAction {
  original: string;
  refined: string;
  assignee?: string;
  due?: string;
}

export interface RefinedDecision {
  original: string;
  refined: string;
}

/**
 * Refine/rewrite action items using LLM
 * Makes them more concise and clear
 */
export async function refineActions(
  actions: ExtractedAction[]
): Promise<ExtractedAction[]> {
  // Check if LLM is enabled
  if (!featureFlags.CASPER_ENABLE_LLM) {
    return actions; // Return as-is if LLM not enabled
  }

  try {
    const casperRefineActions = httpsCallable(functions, "casperRefineActions");

    const actionsToRefine = actions.map((action) => ({
      title: action.title,
      assignee: action.assignee,
      due: action.due,
    }));

    const result = await casperRefineActions({ actions: actionsToRefine });

    const data = result.data as {
      success: boolean;
      refined: RefinedAction[];
    };

    if (!data.success || !data.refined) {
      console.warn("LLM refinement failed, returning original actions");
      return actions;
    }

    // Merge refined titles back into actions
    return actions.map((action, index) => ({
      ...action,
      title: data.refined[index]?.refined || action.title,
      assignee: data.refined[index]?.assignee || action.assignee,
      due: data.refined[index]?.due || action.due,
    }));
  } catch (error) {
    console.error("Error refining actions with LLM:", error);
    return actions; // Return original on error
  }
}

/**
 * Refine/rewrite decisions using LLM
 * Makes them more concise and clear
 */
export async function refineDecisions(
  decisions: ExtractedDecision[]
): Promise<ExtractedDecision[]> {
  // Check if LLM is enabled
  if (!featureFlags.CASPER_ENABLE_LLM) {
    return decisions; // Return as-is if LLM not enabled
  }

  try {
    const casperRefineDecisions = httpsCallable(
      functions,
      "casperRefineDecisions"
    );

    const decisionsToRefine = decisions.map((decision) => ({
      content: decision.content,
    }));

    const result = await casperRefineDecisions({
      decisions: decisionsToRefine,
    });

    const data = result.data as {
      success: boolean;
      refined: RefinedDecision[];
    };

    if (!data.success || !data.refined) {
      console.warn("LLM refinement failed, returning original decisions");
      return decisions;
    }

    // Merge refined content back into decisions
    return decisions.map((decision, index) => ({
      ...decision,
      content: data.refined[index]?.refined || decision.content,
    }));
  } catch (error) {
    console.error("Error refining decisions with LLM:", error);
    return decisions; // Return original on error
  }
}

/**
 * Helper to check if LLM enhancement is available
 */
export function isLLMEnhancementAvailable(): boolean {
  return featureFlags.CASPER_ENABLE_LLM;
}
