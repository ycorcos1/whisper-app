/**
 * Planner Service
 * PR 7: Client-side service for multi-step agent orchestration
 * Calls Firebase Cloud Functions for plan generation
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../../lib/firebase";
import { Plan } from "../../types/casper";

/**
 * Create a new plan using multi-step orchestration
 */
export async function createPlan(
  query: string,
  conversationId?: string
): Promise<{ success: boolean; planId?: string; plan?: Plan; error?: string }> {
  try {
    const casperPlan = httpsCallable(functions, "casperPlan");

    const result = await casperPlan({
      query,
      conversationId,
    });

    const data = result.data as any;

    if (data.success) {
      return {
        success: true,
        planId: data.planId,
        plan: data.plan,
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to create plan",
      };
    }
  } catch (error) {
    console.error("Error creating plan:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a specific plan by ID
 */
export async function getPlan(
  planId: string
): Promise<{ success: boolean; plan?: Plan; error?: string }> {
  try {
    const casperGetPlan = httpsCallable(functions, "casperGetPlan");

    const result = await casperGetPlan({ planId });
    const data = result.data as any;

    if (data.success) {
      return {
        success: true,
        plan: data.plan,
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to get plan",
      };
    }
  } catch (error) {
    console.error("Error getting plan:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List all plans for the current user
 */
export async function listPlans(options?: {
  limit?: number;
  conversationId?: string;
}): Promise<{ success: boolean; plans?: Plan[]; error?: string }> {
  try {
    const casperListPlans = httpsCallable(functions, "casperListPlans");

    const result = await casperListPlans(options || {});
    const data = result.data as any;

    if (data.success) {
      return {
        success: true,
        plans: data.plans,
      };
    } else {
      return {
        success: false,
        error: data.error || "Failed to list plans",
      };
    }
  } catch (error) {
    console.error("Error listing plans:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
