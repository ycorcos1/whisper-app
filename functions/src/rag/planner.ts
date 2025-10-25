/**
 * Multi-Step Planner Cloud Function
 * PR 7: Callable function for multi-step agent orchestration
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  detectIntent,
  decomposeTasks,
  executeTasks,
  summarizePlan,
  Plan,
} from "./orchestrator";
import { DefaultToolExecutor } from "./tools";

/**
 * Casper Plan Function
 * Executes multi-step orchestration to generate plans
 */
export const casperPlan = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to create plans"
    );
  }

  const { query, conversationId } = data;

  // Validate input
  if (!query || typeof query !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query must be a non-empty string"
    );
  }

  if (query.length < 10) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query too short (min 10 characters)"
    );
  }

  if (query.length > 1000) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query too long (max 1000 characters)"
    );
  }

  const userId = context.auth.uid;
  const planId = admin.firestore().collection("agent").doc().id;

  functions.logger.info("casperPlan called", {
    userId,
    planId,
    query,
    conversationId,
  });

  try {
    // Step 1: Detect Intent
    const intent = await detectIntent(query);
    functions.logger.info("Intent detected:", intent);

    if (intent === "unknown") {
      return {
        success: false,
        error:
          "Could not determine planning intent. Try a more specific query about offsite planning, meeting scheduling, or task breakdown.",
      };
    }

    // Step 2: Decompose Tasks
    const tasks = await decomposeTasks(intent, query, conversationId);
    functions.logger.info("Tasks decomposed:", tasks.length);

    // Create initial plan document
    const plan: Plan = {
      id: planId,
      intent,
      tasks,
      summary: "",
      createdAt: Date.now(),
      status: "running",
      userId,
      conversationId,
    };

    // Save plan to Firestore (initial state)
    await admin
      .firestore()
      .collection("agent")
      .doc(userId)
      .collection("plans")
      .doc(planId)
      .set(plan);

    // Step 3: Execute Tasks
    const toolExecutor = new DefaultToolExecutor();
    const executedTasks = await executeTasks(tasks, toolExecutor);
    functions.logger.info("Tasks executed");

    // Step 4: Summarize Plan
    const summary = await summarizePlan(intent, query, executedTasks);
    functions.logger.info("Plan summarized");

    // Update plan with results
    const completedPlan: Plan = {
      ...plan,
      tasks: executedTasks,
      summary,
      completedAt: Date.now(),
      status: "completed",
    };

    // Save completed plan
    await admin
      .firestore()
      .collection("agent")
      .doc(userId)
      .collection("plans")
      .doc(planId)
      .set(completedPlan);

    functions.logger.info("Plan completed:", planId);

    return {
      success: true,
      planId,
      plan: completedPlan,
    };
  } catch (error) {
    functions.logger.error("Error in casperPlan:", error);

    // Update plan status to failed
    try {
      await admin
        .firestore()
        .collection("agent")
        .doc(userId)
        .collection("plans")
        .doc(planId)
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
    } catch (updateError) {
      functions.logger.error("Failed to update plan status:", updateError);
    }

    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to create plan"
    );
  }
});

/**
 * Get Plan Function
 * Retrieves a specific plan by ID
 */
export const casperGetPlan = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to retrieve plans"
    );
  }

  const { planId } = data;

  if (!planId || typeof planId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Plan ID must be a non-empty string"
    );
  }

  const userId = context.auth.uid;

  try {
    const planDoc = await admin
      .firestore()
      .collection("agent")
      .doc(userId)
      .collection("plans")
      .doc(planId)
      .get();

    if (!planDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Plan not found");
    }

    return {
      success: true,
      plan: planDoc.data(),
    };
  } catch (error) {
    functions.logger.error("Error in casperGetPlan:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to retrieve plan"
    );
  }
});

/**
 * List Plans Function
 * Lists all plans for the authenticated user
 */
export const casperListPlans = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to list plans"
    );
  }

  const userId = context.auth.uid;
  const { limit = 20, conversationId } = data;

  try {
    let query = admin
      .firestore()
      .collection("agent")
      .doc(userId)
      .collection("plans")
      .orderBy("createdAt", "desc")
      .limit(limit);

    // Filter by conversation if specified
    if (conversationId) {
      query = query.where("conversationId", "==", conversationId) as any;
    }

    const snapshot = await query.get();

    const plans = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      plans,
    };
  } catch (error) {
    functions.logger.error("Error in casperListPlans:", error);
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to list plans"
    );
  }
});

