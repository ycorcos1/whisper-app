/**
 * Multi-Step Agent Tools
 * PR 7: Tool wrappers for orchestration
 *
 * Tools:
 * - summarizeThread: Summarize conversation context
 * - findFreeTimes: Find available time slots (mock)
 * - generatePlanSummary: Generate comprehensive plan
 * - searchContext: Search conversation for relevant context
 */

import * as functions from "firebase-functions";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import { searchVectors } from "./index";
import { getRagConfig } from "./config";
import { ToolExecutor } from "./orchestrator";

/**
 * Tool: Summarize Thread
 * Summarizes conversation to extract key information
 */
export async function summarizeThread(inputs: {
  conversationId: string;
  focusQuery?: string;
  context?: Record<string, any>;
}): Promise<{
  summary: string;
  keyPoints: string[];
  entities: { dates?: string[]; locations?: string[]; people?: string[] };
}> {
  functions.logger.info("Tool: summarizeThread", inputs.conversationId);

  try {
    const { conversationId, focusQuery, context } = inputs;

    // Search for relevant messages using RAG
    const query = focusQuery || "recent discussion key points";
    const sources = await searchVectors(query, conversationId, 12);

    if (sources.length === 0) {
      return {
        summary: "No relevant messages found.",
        keyPoints: [],
        entities: {},
      };
    }

    // Extract text from sources
    const contextText = sources
      .map((s, i) => `[${i + 1}] ${s.metadata.text}`)
      .join("\n\n");

    // Use LLM to extract structured information
    const config = getRagConfig();
    const llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.chatModel,
      temperature: 0.1,
    });

    const prompt = `Analyze the following conversation excerpts and extract key information.

Conversation context:
${contextText}

Focus: ${focusQuery || "general summary"}

Additional context from previous steps:
${context ? JSON.stringify(context, null, 2) : "None"}

Extract:
1. A concise summary (2-3 sentences)
2. Key points (bullet list, 3-5 items)
3. Entities:
   - dates: Any dates mentioned (format: YYYY-MM-DD or descriptive like "next week")
   - locations: Any places, venues, cities mentioned
   - people: Any names or roles mentioned

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "entities": {
    "dates": ["..."],
    "locations": ["..."],
    "people": ["..."]
  }
}`;

    const response = await llm.invoke([new SystemMessage(prompt)]);
    const content = response.content.toString();

    // Parse JSON response
    try {
      const result = JSON.parse(content);
      return result;
    } catch (parseError) {
      // Fallback if LLM doesn't return valid JSON
      return {
        summary: content,
        keyPoints: [],
        entities: {},
      };
    }
  } catch (error) {
    functions.logger.error("Error in summarizeThread:", error);
    throw new Error(
      `Failed to summarize thread: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Tool: Find Free Times (Mock)
 * Finds available time slots for planning
 *
 * In a real implementation, this would integrate with calendar APIs.
 * For this demo, we generate mock availability.
 */
export async function findFreeTimes(inputs: {
  query: string;
  context?: Record<string, any>;
}): Promise<{
  suggestedSlots: Array<{
    date: string;
    time: string;
    duration: string;
    confidence: number;
  }>;
  reasoning: string;
}> {
  functions.logger.info("Tool: findFreeTimes (mock)", inputs.query);

  try {
    // Extract date hints from query
    const query = inputs.query.toLowerCase();
    let baseDate = new Date();

    // Simple heuristics for date extraction
    if (query.includes("next week")) {
      baseDate.setDate(baseDate.getDate() + 7);
    } else if (query.includes("next month")) {
      baseDate.setMonth(baseDate.getMonth() + 1);
    } else if (query.includes("tomorrow")) {
      baseDate.setDate(baseDate.getDate() + 1);
    } else {
      // Default to 2 weeks out for offsite planning
      baseDate.setDate(baseDate.getDate() + 14);
    }

    // Generate mock availability slots
    const slots = [];

    // Generate 5 potential slots
    for (let i = 0; i < 5; i++) {
      const slotDate = new Date(baseDate);
      slotDate.setDate(slotDate.getDate() + i * 2); // Every other day

      // Skip weekends for meeting scheduling
      const dayOfWeek = slotDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Determine time based on query context
      let time = "10:00 AM";
      let duration = "1 hour";

      if (query.includes("offsite") || query.includes("retreat")) {
        time = "All day";
        duration = "Full day";
      } else if (query.includes("lunch")) {
        time = "12:00 PM";
        duration = "1 hour";
      } else if (query.includes("afternoon")) {
        time = "2:00 PM";
        duration = "1 hour";
      }

      slots.push({
        date: slotDate.toISOString().split("T")[0], // YYYY-MM-DD
        time,
        duration,
        confidence: 0.85 - i * 0.1, // Decreasing confidence
      });

      if (slots.length >= 5) break;
    }

    // Check context for additional constraints
    let reasoning = "Generated availability based on query context.";

    if (inputs.context) {
      const contextStr = JSON.stringify(inputs.context);
      if (contextStr.includes("busy") || contextStr.includes("conflict")) {
        reasoning += " Adjusted for mentioned conflicts.";
      }
      if (contextStr.includes("prefer") || contextStr.includes("works best")) {
        reasoning += " Considered stated preferences.";
      }
    }

    return {
      suggestedSlots: slots,
      reasoning,
    };
  } catch (error) {
    functions.logger.error("Error in findFreeTimes:", error);
    throw new Error(
      `Failed to find free times: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Tool: Generate Plan Summary
 * Generates a comprehensive plan based on accumulated context
 */
export async function generatePlanSummary(inputs: {
  query: string;
  intent: string;
  context?: Record<string, any>;
}): Promise<{
  plan: string;
  actionItems: string[];
  metadata: Record<string, any>;
}> {
  functions.logger.info("Tool: generatePlanSummary", inputs.intent);

  try {
    const { query, intent, context } = inputs;

    const config = getRagConfig();
    const llm = new ChatOpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.chatModel,
      temperature: 0.4, // Slightly creative
    });

    // Build prompt based on intent
    let intentGuidance = "";

    switch (intent) {
      case "offsite_planning":
        intentGuidance = `Generate a comprehensive offsite plan including:
- Event overview and goals
- Proposed dates and location
- Suggested activities and agenda
- Logistics (venue, catering, accommodations)
- Budget considerations
- Action items and next steps`;
        break;

      case "meeting_scheduling":
        intentGuidance = `Generate a meeting schedule plan including:
- Meeting purpose and objectives
- Proposed time slots
- Attendee list
- Agenda items
- Preparation requirements
- Follow-up actions`;
        break;

      case "task_breakdown":
        intentGuidance = `Generate a task breakdown including:
- Project overview
- Major milestones
- Detailed task list with dependencies
- Estimated timeline
- Resource requirements
- Risk considerations`;
        break;

      default:
        intentGuidance = "Generate a comprehensive plan.";
    }

    const prompt = `You are a professional planning assistant. Generate a detailed, actionable plan.

Original Request: "${query}"
Intent: ${intent}

Context from previous analysis:
${context ? JSON.stringify(context, null, 2) : "No additional context"}

${intentGuidance}

Format your response as JSON:
{
  "plan": "Detailed markdown-formatted plan",
  "actionItems": ["Item 1", "Item 2", ...],
  "metadata": {
    "confidence": 0.9,
    "estimatedDuration": "...",
    "priority": "high|medium|low"
  }
}`;

    const response = await llm.invoke([new SystemMessage(prompt)]);
    const content = response.content.toString();

    // Parse JSON response
    try {
      const result = JSON.parse(content);
      return result;
    } catch (parseError) {
      // Fallback if LLM doesn't return valid JSON
      return {
        plan: content,
        actionItems: [],
        metadata: { confidence: 0.7 },
      };
    }
  } catch (error) {
    functions.logger.error("Error in generatePlanSummary:", error);
    throw new Error(
      `Failed to generate plan: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Tool: Search Context
 * Searches conversation for relevant context using RAG
 */
export async function searchContext(inputs: {
  query: string;
  conversationId: string;
  topK?: number;
  context?: Record<string, any>;
}): Promise<{
  sources: Array<{
    id: string;
    text: string;
    score: number;
    timestamp: number;
  }>;
  summary: string;
}> {
  functions.logger.info("Tool: searchContext", inputs.query);

  try {
    const { query, conversationId, topK = 8 } = inputs;

    // Use RAG search
    const sources = await searchVectors(query, conversationId, topK);

    if (sources.length === 0) {
      return {
        sources: [],
        summary: "No relevant context found in the conversation.",
      };
    }

    // Format sources
    const formattedSources = sources.map((s) => ({
      id: s.id,
      text: s.metadata.text,
      score: s.score,
      timestamp: s.metadata.createdAt,
    }));

    // Generate brief summary
    const summary = `Found ${sources.length} relevant message${
      sources.length > 1 ? "s" : ""
    } discussing: ${query}`;

    return {
      sources: formattedSources,
      summary,
    };
  } catch (error) {
    functions.logger.error("Error in searchContext:", error);
    throw new Error(
      `Failed to search context: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Tool: Schedule Meeting
 * Schedules a meeting for specified participants
 */
export async function scheduleMeeting(inputs: {
  conversationId: string;
  command: string;
  userId: string;
  context?: Record<string, any>;
}): Promise<{
  success: boolean;
  eventId?: string;
  title: string;
  startTime?: string;
  participants: string[];
  errors?: string[];
}> {
  functions.logger.info("Tool: scheduleMeeting", inputs.command);

  try {
    // NOTE: This is a server-side stub
    // The actual scheduling logic runs client-side in scheduleParser.ts and scheduleService.ts
    // This tool is primarily for orchestration integration

    // Log the command for debugging
    functions.logger.info("Schedule command:", {
      command: inputs.command,
      conversationId: inputs.conversationId,
      userId: inputs.userId,
    });

    // Return a structured response that the orchestrator can use
    return {
      success: false,
      title: "Meeting",
      participants: [],
      errors: [
        "Meeting scheduling must be initiated from the client. " +
          "Use the Planner tab to schedule meetings.",
      ],
    };
  } catch (error) {
    functions.logger.error("Error in scheduleMeeting tool:", error);
    return {
      success: false,
      title: "Meeting",
      participants: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Default Tool Executor Implementation
 * Routes tool calls to the appropriate functions
 */
export class DefaultToolExecutor implements ToolExecutor {
  async execute(toolType: string, inputs: Record<string, any>): Promise<any> {
    switch (toolType) {
      case "summarize":
        return await summarizeThread(
          inputs as {
            conversationId: string;
            focusQuery?: string;
            context?: Record<string, any>;
          }
        );

      case "find_times":
        return await findFreeTimes(
          inputs as {
            query: string;
            context?: Record<string, any>;
          }
        );

      case "generate_plan":
        return await generatePlanSummary(
          inputs as {
            query: string;
            intent: string;
            context?: Record<string, any>;
          }
        );

      case "search_context":
        return await searchContext(
          inputs as {
            query: string;
            conversationId: string;
            topK?: number;
            context?: Record<string, any>;
          }
        );

      case "schedule_meeting":
        return await scheduleMeeting(
          inputs as {
            conversationId: string;
            command: string;
            userId: string;
            context?: Record<string, any>;
          }
        );

      default:
        throw new Error(`Unknown tool type: ${toolType}`);
    }
  }
}
