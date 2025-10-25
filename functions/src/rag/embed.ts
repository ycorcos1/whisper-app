/**
 * OpenAI Embedding Client
 * Generates embeddings for text using OpenAI's API
 */

import OpenAI from "openai";
import { getRagConfig } from "./config";

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const config = getRagConfig();
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return openaiClient;
}

/**
 * Generate embedding for a single text
 * @param text Text to embed
 * @returns 1536-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const config = getRagConfig();
  const client = getOpenAIClient();

  try {
    const response = await client.embeddings.create({
      model: config.openai.embeddingModel,
      input: text.trim(),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Filter out empty texts
  const validTexts = texts.filter((t) => t && t.trim().length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  const config = getRagConfig();
  const client = getOpenAIClient();

  try {
    // OpenAI supports batch embedding up to 2048 items
    const batchSize = 100;
    const batches: string[][] = [];

    for (let i = 0; i < validTexts.length; i += batchSize) {
      batches.push(validTexts.slice(i, i + batchSize));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      const response = await client.embeddings.create({
        model: config.openai.embeddingModel,
        input: batch.map((t) => t.trim()),
      });

      allEmbeddings.push(...response.data.map((item) => item.embedding));
    }

    return allEmbeddings;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error(
      `Failed to generate embeddings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Normalize text for embedding
 * Removes extra whitespace and limits length
 */
export function normalizeText(text: string, maxLength: number = 8000): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}
