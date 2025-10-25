/**
 * Multi-Step Agent Orchestrator
 * PR 7: Reasoning-based multi-tool orchestration for planning & coordination
 *
 * Flow: detectIntent → decomposeTasks → callTools → summarizePlan
 */

import * as functions from "firebase-functions";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { getRagConfig } from "./config";

/**
 * Intent type for the orchestrator
 */
export type Intent =
  | "offsite_planning"
  | "meeting_scheduling"
  | "task_breakdown"
  | "unknown";

/**
 * Task definition for decomposition
 */
export interface AgentTask {
  id: string;
  type: "summarize" | "find_times" | "generate_plan" | "search_context";
  description: string;
  inputs: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
  error?: string;
}

/**
 * Plan result from orchestration
 */
export interface Plan {
  id: string;
  intent: Intent;
  tasks: AgentTask[];
  summary: string;
  createdAt: number;
  completedAt?: number;
  status: "pending" | "running" | "completed" | "failed";
  userId: string;
  conversationId?: string;
}

/**
 * Step 1: Detect Intent
 * Analyzes the query to determine what type of planning is needed
 */
export async function detectIntent(query: string): Promise<Intent> {
  try {
    functions.logger.info("Detecting intent for query:", query);

    // Pattern-based detection (fast, deterministic)
    const lowerQuery = query.toLowerCase();

    // Offsite planning patterns
    if (
      /offsite|retreat|team building|planning session|workshop/.test(
        lowerQuery
      ) &&
      /location|venue|place|where|schedule|agenda/.test(lowerQuery)
    ) {
      return "offsite_planning";
    }

    // Meeting scheduling patterns
    if (
      /meeting|call|sync|catchup|1:1|one-on-one/.test(lowerQuery) &&
      /when|time|schedule|available|free/.test(lowerQuery)
    ) {
      return "meeting_scheduling";
    }

    // Task breakdown patterns
    if (
      /task|project|initiative|feature|plan/.test(lowerQuery) &&
      /break down|steps|how to|action items|roadmap/.test(lowerQuery)
    ) {
      return "task_breakdown";
    }

    // If patterns don't match, use LLM for classification
    const config = getRagConfig();
    const llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.chatModel,
      temperature: 0, // Deterministic for intent detection
    });

    const prompt = `Analyze this query and classify the intent:

Query: "${query}"

Intents:
- offsite_planning: Planning a team offsite, retreat, or event (location, dates, activities)
- meeting_scheduling: Scheduling a meeting or finding free time slots
- task_breakdown: Breaking down a project or task into actionable steps
- unknown: None of the above

Respond with ONLY the intent name (no explanation).`;

    const response = await llm.invoke([new SystemMessage(prompt)]);
    const intent = response.content.toString().trim().toLowerCase();

    if (
      ["offsite_planning", "meeting_scheduling", "task_breakdown"].includes(
        intent
      )
    ) {
      return intent as Intent;
    }

    return "unknown";
  } catch (error) {
    functions.logger.error("Error detecting intent:", error);
    return "unknown";
  }
}

/**
 * Step 2: Decompose Tasks
 * Breaks down the intent into specific tool calls
 */
export async function decomposeTasks(
  intent: Intent,
  query: string,
  conversationId?: string
): Promise<AgentTask[]> {
  functions.logger.info("Decomposing tasks for intent:", intent);

  const tasks: AgentTask[] = [];

  switch (intent) {
    case "offsite_planning":
      // Step 1: Search conversation for context
      if (conversationId) {
        tasks.push({
          id: "task_1",
          type: "search_context",
          description: "Search conversation for offsite-related discussions",
          inputs: {
            query: "offsite planning location date activities team",
            conversationId,
          },
          status: "pending",
        });
      }

      // Step 2: Summarize thread to extract key details
      if (conversationId) {
        tasks.push({
          id: "task_2",
          type: "summarize",
          description:
            "Summarize conversation to extract offsite details (location, dates, attendees)",
          inputs: {
            conversationId,
            focusQuery: query,
          },
          status: "pending",
        });
      }

      // Step 3: Find free times (mock)
      tasks.push({
        id: "task_3",
        type: "find_times",
        description: "Find potential dates for the offsite",
        inputs: {
          query,
        },
        status: "pending",
      });

      // Step 4: Generate plan summary
      tasks.push({
        id: "task_4",
        type: "generate_plan",
        description: "Generate comprehensive offsite plan",
        inputs: {
          query,
          intent: "offsite_planning",
        },
        status: "pending",
      });
      break;

    case "meeting_scheduling":
      // Step 1: Search for availability context
      if (conversationId) {
        tasks.push({
          id: "task_1",
          type: "search_context",
          description: "Search for availability and scheduling constraints",
          inputs: {
            query: "meeting schedule time availability free busy",
            conversationId,
          },
          status: "pending",
        });
      }

      // Step 2: Find free times
      tasks.push({
        id: "task_2",
        type: "find_times",
        description: "Find free time slots for meeting",
        inputs: {
          query,
        },
        status: "pending",
      });

      // Step 3: Generate plan
      tasks.push({
        id: "task_3",
        type: "generate_plan",
        description: "Generate meeting schedule options",
        inputs: {
          query,
          intent: "meeting_scheduling",
        },
        status: "pending",
      });
      break;

    case "task_breakdown":
      // Step 1: Search for related context
      if (conversationId) {
        tasks.push({
          id: "task_1",
          type: "search_context",
          description: "Search conversation for project context",
          inputs: {
            query: query,
            conversationId,
          },
          status: "pending",
        });
      }

      // Step 2: Summarize requirements
      if (conversationId) {
        tasks.push({
          id: "task_2",
          type: "summarize",
          description: "Summarize project requirements and constraints",
          inputs: {
            conversationId,
            focusQuery: query,
          },
          status: "pending",
        });
      }

      // Step 3: Generate task breakdown
      tasks.push({
        id: "task_3",
        type: "generate_plan",
        description: "Break down project into actionable tasks",
        inputs: {
          query,
          intent: "task_breakdown",
        },
        status: "pending",
      });
      break;

    default:
      // Unknown intent - just return empty
      break;
  }

  return tasks;
}

/**
 * Step 3: Execute Tasks
 * Runs each task in sequence, passing results forward
 */
export async function executeTasks(
  tasks: AgentTask[],
  toolExecutor: ToolExecutor
): Promise<AgentTask[]> {
  functions.logger.info("Executing tasks:", tasks.length);

  const results: AgentTask[] = [];
  const context: Record<string, any> = {}; // Accumulate results

  for (const task of tasks) {
    try {
      task.status = "running";
      functions.logger.info("Running task:", task.id, task.type);

      // Add accumulated context to task inputs
      const enrichedInputs = { ...task.inputs, context };

      // Execute the tool
      const result = await toolExecutor.execute(task.type, enrichedInputs);

      task.status = "completed";
      task.result = result;

      // Store in context for next tasks
      context[task.id] = result;

      results.push(task);
    } catch (error) {
      functions.logger.error("Task execution failed:", task.id, error);
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";
      results.push(task);

      // Continue with other tasks (graceful degradation)
    }
  }

  return results;
}

/**
 * Step 4: Summarize Plan
 * Combines all task results into a final plan summary
 */
export async function summarizePlan(
  intent: Intent,
  query: string,
  tasks: AgentTask[]
): Promise<string> {
  functions.logger.info("Summarizing plan for intent:", intent);

  const config = getRagConfig();
  const llm = new ChatOpenAI({
    openAIApiKey: config.openai.apiKey,
    modelName: config.openai.chatModel,
    temperature: 0.3, // Slightly creative
  });

  // Collect task results
  const taskSummaries = tasks
    .filter((t) => t.status === "completed" && t.result)
    .map(
      (t) => `[${t.id}] ${t.description}:\n${JSON.stringify(t.result, null, 2)}`
    )
    .join("\n\n");

  const systemPrompt = `You are a planning assistant. Create a concise, actionable summary of the plan based on task results.

Intent: ${intent}
Original Query: "${query}"

Task Results:
${taskSummaries}

Generate a markdown-formatted plan summary with:
1. **Overview** - What is being planned
2. **Key Details** - Important dates, locations, participants
3. **Next Steps** - Actionable items
4. **Timeline** - If applicable

Keep it professional and well-structured.`;

  const response = await llm.invoke([new SystemMessage(systemPrompt)]);
  return response.content.toString();
}

/**
 * Tool Executor Interface
 * Defines how tools are executed
 */
export interface ToolExecutor {
  execute(toolType: string, inputs: Record<string, any>): Promise<any>;
}
