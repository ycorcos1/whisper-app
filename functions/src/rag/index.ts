/**
 * Pinecone Indexer & Search
 * Handles vector storage and retrieval from Pinecone
 */

import { Pinecone, RecordMetadata } from "@pinecone-database/pinecone";
import { getRagConfig } from "./config";
import { generateEmbedding } from "./embed";

let pineconeClient: Pinecone | null = null;

/**
 * Get or create Pinecone client instance
 */
function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const config = getRagConfig();
    pineconeClient = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
  }
  return pineconeClient;
}

/**
 * Metadata stored with each vector
 */
export interface VectorMetadata extends RecordMetadata {
  cid: string; // conversation id
  mid: string; // message id
  text: string; // normalized content
  createdAt: number; // timestamp
}

/**
 * Search result with score and metadata
 */
export interface SearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

/**
 * Chunk long text into segments suitable for embedding
 * @param text Text to chunk
 * @param maxChunkSize Maximum characters per chunk
 * @param overlap Overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 800,
  overlap: number = 100
): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);

    // Move start position with overlap
    start = end - overlap;

    // Prevent infinite loop on very small texts
    if (start >= text.length || end === text.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Upsert a single vector to Pinecone
 * @param id Unique vector ID
 * @param embedding Vector embedding
 * @param metadata Metadata to store with vector
 */
export async function upsertVector(
  id: string,
  embedding: number[],
  metadata: VectorMetadata
): Promise<void> {
  const config = getRagConfig();
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);

  try {
    await index.namespace(config.pinecone.namespace).upsert([
      {
        id,
        values: embedding,
        metadata,
      },
    ]);
  } catch (error) {
    console.error("Error upserting vector:", error);
    throw new Error(
      `Failed to upsert vector: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upsert multiple vectors in batch
 * @param vectors Array of vectors to upsert
 */
export async function upsertVectors(
  vectors: Array<{
    id: string;
    embedding: number[];
    metadata: VectorMetadata;
  }>
): Promise<void> {
  if (vectors.length === 0) {
    return;
  }

  const config = getRagConfig();
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);

  try {
    // Pinecone recommends batches of 100-500 vectors
    const batchSize = 100;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const records = batch.map((v) => ({
        id: v.id,
        values: v.embedding,
        metadata: v.metadata,
      }));

      await index.namespace(config.pinecone.namespace).upsert(records);
    }
  } catch (error) {
    console.error("Error upserting vectors:", error);
    throw new Error(
      `Failed to upsert vectors: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Search for similar vectors by query text
 * @param query Query text
 * @param conversationId Optional conversation ID to filter by
 * @param topK Number of results to return
 * @returns Array of search results
 */
export async function searchVectors(
  query: string,
  conversationId?: string,
  topK?: number
): Promise<SearchResult[]> {
  const config = getRagConfig();
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Build filter
    const filter = conversationId
      ? { cid: { $eq: conversationId } }
      : undefined;

    // Search
    const searchResults = await index
      .namespace(config.pinecone.namespace)
      .query({
        vector: queryEmbedding,
        topK: topK || config.vector.topK,
        includeMetadata: true,
        filter,
      });

    // Map results
    return searchResults.matches.map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as VectorMetadata,
    }));
  } catch (error) {
    console.error("Error searching vectors:", error);
    throw new Error(
      `Failed to search vectors: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete vectors by IDs
 * @param ids Vector IDs to delete
 */
export async function deleteVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const config = getRagConfig();
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);

  try {
    await index.namespace(config.pinecone.namespace).deleteMany(ids);
  } catch (error) {
    console.error("Error deleting vectors:", error);
    throw new Error(
      `Failed to delete vectors: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete all vectors for a conversation
 * @param conversationId Conversation ID
 */
export async function deleteConversationVectors(
  conversationId: string
): Promise<void> {
  const config = getRagConfig();
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);

  try {
    await index.namespace(config.pinecone.namespace).deleteMany({
      cid: conversationId,
    });
  } catch (error) {
    console.error("Error deleting conversation vectors:", error);
    throw new Error(
      `Failed to delete conversation vectors: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  const config = getRagConfig();
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);

  try {
    return await index.describeIndexStats();
  } catch (error) {
    console.error("Error getting index stats:", error);
    throw new Error(
      `Failed to get index stats: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
