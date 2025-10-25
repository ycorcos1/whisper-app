/**
 * Casper RAG Triggers
 * Automatically index messages as they're created
 */

import * as functions from "firebase-functions";
import { generateEmbedding } from "./embed";
import { chunkText, upsertVector } from "./index";

/**
 * Message onCreate Trigger
 * Automatically indexes new messages to Pinecone
 */
export const indexMessage = functions.firestore
  .document("conversations/{cid}/messages/{mid}")
  .onCreate(async (snapshot, context) => {
    const { cid, mid } = context.params;
    const message = snapshot.data();

    // Only index text messages
    if (message.type !== "text" || !message.text) {
      functions.logger.info("Skipping non-text message", { mid });
      return null;
    }

    try {
      functions.logger.info("Indexing message", { cid, mid });

      const text = message.text.trim();

      // Skip very short messages
      if (text.length < 10) {
        functions.logger.info("Skipping short message", {
          mid,
          length: text.length,
        });
        return null;
      }

      // Chunk if text is long (>800 chars)
      const chunks = chunkText(text, 800, 100);

      // Index each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = chunks.length > 1 ? `${mid}_chunk${i}` : mid;

        // Generate embedding
        const embedding = await generateEmbedding(chunk);

        // Upsert to Pinecone
        await upsertVector(chunkId, embedding, {
          cid,
          mid,
          text: chunk,
          createdAt: message.timestamp?.toMillis() || Date.now(),
        });

        functions.logger.info("Indexed chunk", {
          mid,
          chunkId,
          length: chunk.length,
        });
      }

      return {
        success: true,
        mid,
        chunks: chunks.length,
      };
    } catch (error) {
      functions.logger.error("Error indexing message", { mid, error });
      // Don't throw - let message creation succeed even if indexing fails
      return null;
    }
  });
