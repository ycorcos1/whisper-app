/**
 * LangChain Retrieval & Grounding Chain
 * Natural language Q&A with context grounding from RAG
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getRagConfig } from "./config";
import { searchVectors, SearchResult } from "./index";

let chatModel: ChatOpenAI | null = null;

/**
 * Get or create ChatOpenAI instance
 */
function getChatModel(): ChatOpenAI {
  if (!chatModel) {
    const config = getRagConfig();
    chatModel = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      model: config.openai.chatModel,
      temperature: 0.3,
      maxTokens: 500,
    });
  }
  return chatModel;
}

/**
 * Format search results into context string
 */
function formatContext(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No relevant context found.";
  }

  return results
    .map((result, index) => {
      const date = new Date(result.metadata.createdAt);
      const dateStr = date.toLocaleString();
      return `[${index + 1}] (${dateStr})\n${result.metadata.text}\n`;
    })
    .join("\n");
}

/**
 * Answer a question using RAG (Retrieval Augmented Generation)
 * @param question User's question
 * @param conversationId Conversation to search in
 * @param topK Number of context snippets to retrieve
 * @returns AI-generated answer with citations
 */
export async function answerQuestion(
  question: string,
  conversationId?: string,
  topK: number = 6
): Promise<{
  answer: string;
  sources: SearchResult[];
}> {
  try {
    // Step 1: Retrieve relevant context
    const searchResults = await searchVectors(question, conversationId, topK);

    // Step 2: Format context
    const context = formatContext(searchResults);

    // Step 3: Create prompt
    const systemPrompt = `You are a helpful assistant that answers questions about chat conversations.

Context snippets from the conversation:
${context}

Instructions:
- Answer the user's question based ONLY on the provided context
- Be concise and specific
- Cite relevant message timestamps when referring to specific information
- If the context doesn't contain enough information to answer, say so clearly
- Don't make up information that isn't in the context`;

    // Step 4: Call LLM
    const model = getChatModel();
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(question),
    ];

    const response = await model.invoke(messages);
    const answer =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return {
      answer,
      sources: searchResults,
    };
  } catch (error) {
    console.error("Error answering question:", error);
    throw new Error(
      `Failed to answer question: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate a summary of conversation messages
 * @param conversationId Conversation to summarize
 * @param focusQuery Optional query to focus the summary on
 * @param length Summary length preference
 * @returns Generated summary
 */
export async function summarizeConversation(
  conversationId: string,
  focusQuery?: string,
  length: "short" | "normal" | "long" = "normal"
): Promise<string> {
  try {
    // Retrieve relevant messages
    const query = focusQuery || "recent messages and decisions";
    const topK = length === "short" ? 6 : length === "normal" ? 12 : 20;

    const searchResults = await searchVectors(query, conversationId, topK);

    if (searchResults.length === 0) {
      return "No messages found in this conversation.";
    }

    // Format context
    const context = formatContext(searchResults);

    // Create summary prompt
    const lengthGuide = {
      short: "3-5 sentences",
      normal: "5-10 sentences",
      long: "10-15 sentences",
    };

    const systemPrompt = `You are a concise project assistant. Summarize the provided chat excerpts for a software team.

Chat excerpts:
${context}

Create a ${lengthGuide[length]} summary with these sections:
1. **What happened**: Key topics and discussions
2. **Decisions**: Final decisions or agreements (if any)
3. **Open questions**: Unresolved issues (if any)
4. **Next actions**: Action items or next steps (if mentioned)

Be specific and reference relevant timestamps when important.`;

    const model = getChatModel();
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage("Please provide the summary."),
    ];

    const response = await model.invoke(messages);
    const summary =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return summary;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error(
      `Failed to generate summary: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Extract action items from conversation
 * @param conversationId Conversation to analyze
 * @returns Array of action items as JSON
 */
export async function extractActions(conversationId: string): Promise<
  Array<{
    title: string;
    assignee?: string;
    due?: string;
    context: string;
  }>
> {
  try {
    // Search for action-oriented messages
    const query = "action items tasks todos assignments deadlines";
    const searchResults = await searchVectors(query, conversationId, 12);

    if (searchResults.length === 0) {
      return [];
    }

    const context = formatContext(searchResults);

    const systemPrompt = `You are an assistant that extracts actionable tasks from conversations.

Chat excerpts:
${context}

Extract all action items, tasks, or todos mentioned. For each, provide:
- title: Clear description of the task
- assignee: Person assigned (if mentioned)
- due: Due date (if mentioned)
- context: Brief context from the message

Return as a JSON array. If no action items found, return an empty array.
Only extract clear, actionable items - not general discussion.`;

    const model = getChatModel();
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage("Extract action items as JSON array"),
    ];

    const response = await model.invoke(messages);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Try to parse JSON from response
    try {
      // Look for JSON array in response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      console.warn("Failed to parse action items JSON");
      return [];
    }
  } catch (error) {
    console.error("Error extracting actions:", error);
    throw new Error(
      `Failed to extract actions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Extract decisions from conversation
 * @param conversationId Conversation to analyze
 * @returns Array of decision strings
 */
export async function extractDecisions(
  conversationId: string
): Promise<string[]> {
  try {
    // Search for decision-oriented messages
    const query =
      "decided agreed confirmed approved going with final decision consensus";
    const searchResults = await searchVectors(query, conversationId, 12);

    if (searchResults.length === 0) {
      return [];
    }

    const context = formatContext(searchResults);

    const systemPrompt = `You are an assistant that extracts final decisions from conversations.

Chat excerpts:
${context}

List all final decisions or agreements made. Be strict - only include:
- Clear decisions with consensus
- Approved plans or approaches
- Confirmed choices

Format as a bulleted list. Each decision should be one clear sentence.
If no clear decisions found, respond with "No decisions found."`;

    const model = getChatModel();
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage("Extract decisions as bulleted list"),
    ];

    const response = await model.invoke(messages);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Parse bullets
    if (content.toLowerCase().includes("no decisions")) {
      return [];
    }

    const decisions = content
      .split("\n")
      .map((line: string) => line.trim())
      .filter(
        (line: string) =>
          line.startsWith("-") || line.startsWith("•") || line.startsWith("*")
      )
      .map((line: string) => line.replace(/^[-•*]\s*/, ""))
      .filter((line: string) => line.length > 0);

    return decisions;
  } catch (error) {
    console.error("Error extracting decisions:", error);
    throw new Error(
      `Failed to extract decisions: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Test the RAG pipeline with a simple query
 * Used for validation
 */
export async function testRagPipeline(
  testQuery: string = "What are we discussing?",
  conversationId?: string
): Promise<{
  success: boolean;
  results: SearchResult[];
  answer: string;
  error?: string;
}> {
  try {
    const { answer, sources } = await answerQuestion(testQuery, conversationId);

    return {
      success: true,
      results: sources,
      answer,
    };
  } catch (error) {
    return {
      success: false,
      results: [],
      answer: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
