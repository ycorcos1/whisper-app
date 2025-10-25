/**
 * RAG Configuration & Validation (Firebase Functions)
 * Environment validation for server-side RAG operations
 */

import * as functions from "firebase-functions";

export interface RagConfig {
  openai: {
    apiKey: string;
    embeddingModel: string;
    chatModel: string;
  };
  pinecone: {
    apiKey: string;
    indexName: string;
    environment: string;
    namespace: string;
  };
  vector: {
    topK: number;
    dimensions: number;
  };
}

/**
 * Validate that all required environment variables are present
 * @throws Error with instructions if any are missing
 */
export function validateRagConfig(): RagConfig {
  const config = functions.config();

  const missingVars: string[] = [];

  // Check OpenAI
  if (!config.openai?.api_key) {
    missingVars.push("openai.api_key");
  }

  // Check Pinecone
  if (!config.pinecone?.api_key) {
    missingVars.push("pinecone.api_key");
  }
  if (!config.pinecone?.index) {
    missingVars.push("pinecone.index");
  }
  if (!config.pinecone?.environment) {
    missingVars.push("pinecone.environment");
  }

  if (missingVars.length > 0) {
    throw new Error(
      `❌ Missing required Firebase Functions config:\n\n` +
        `${missingVars.map((v) => `  - ${v}`).join("\n")}\n\n` +
        `📝 Setup Instructions:\n` +
        `Run these commands:\n` +
        `firebase functions:config:set openai.api_key="YOUR_KEY"\n` +
        `firebase functions:config:set pinecone.api_key="YOUR_KEY"\n` +
        `firebase functions:config:set pinecone.index="whisper-casper"\n` +
        `firebase functions:config:set pinecone.environment="us-east-1-aws"\n`
    );
  }

  return {
    openai: {
      apiKey: config.openai.api_key,
      embeddingModel:
        config.openai?.embedding_model || "text-embedding-3-small",
      chatModel: config.openai?.chat_model || "gpt-4o-mini",
    },
    pinecone: {
      apiKey: config.pinecone.api_key,
      indexName: config.pinecone.index,
      environment: config.pinecone.environment,
      namespace: config.pinecone?.namespace || "default",
    },
    vector: {
      topK: parseInt(config.vector?.top_k || "6", 10),
      dimensions: 1536, // text-embedding-3-small dimension
    },
  };
}

/**
 * Get RAG config with validation
 * Safe to call multiple times (memoized)
 */
let cachedConfig: RagConfig | null = null;

export function getRagConfig(): RagConfig {
  if (!cachedConfig) {
    cachedConfig = validateRagConfig();
  }
  return cachedConfig;
}

/**
 * Check if RAG is properly configured without throwing
 */
export function isRagConfigured(): boolean {
  try {
    validateRagConfig();
    return true;
  } catch {
    return false;
  }
}
