/**
 * Seed RAG Script
 * Chunks all conversation messages → embeds → upserts to Pinecone
 *
 * Usage:
 *   ts-node scripts/seedRag.ts
 *
 * Or with conversation filter:
 *   ts-node scripts/seedRag.ts --cid abc123
 */

import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// Stub Firestore types for script (replace with actual Firebase Admin SDK if available)
interface Message {
  id: string;
  senderId: string;
  type: "text" | "image";
  text?: string;
  timestamp: Date;
}

interface RagConfig {
  openai: {
    apiKey: string;
    embeddingModel: string;
  };
  pinecone: {
    apiKey: string;
    indexName: string;
    namespace: string;
  };
}

/**
 * Load configuration from environment
 */
function loadConfig(): RagConfig {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndex = process.env.PINECONE_INDEX || "whisper-casper";
  const namespace = process.env.VECTOR_NAMESPACE || "default";

  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  if (!pineconeApiKey) {
    throw new Error("PINECONE_API_KEY is required");
  }

  return {
    openai: {
      apiKey: openaiApiKey,
      embeddingModel: "text-embedding-3-small",
    },
    pinecone: {
      apiKey: pineconeApiKey,
      indexName: pineconeIndex,
      namespace,
    },
  };
}

/**
 * Chunk text into segments
 */
function chunkText(
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

    start = end - overlap;

    if (start >= text.length || end === text.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Normalize text for embedding
 */
function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Generate embeddings using OpenAI
 */
async function generateEmbeddings(
  texts: string[],
  openai: OpenAI,
  model: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await openai.embeddings.create({
    model,
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

/**
 * Main seeding function
 */
async function seedRag(conversationId?: string) {
  console.log("🌱 Starting RAG seed process...\n");

  // Load config
  const config = loadConfig();
  console.log("✓ Configuration loaded");

  // Initialize clients
  const openai = new OpenAI({ apiKey: config.openai.apiKey });
  const pinecone = new Pinecone({ apiKey: config.pinecone.apiKey });
  const index = pinecone.index(config.pinecone.indexName);
  console.log("✓ Clients initialized");

  // NOTE: In a real implementation, you would use Firebase Admin SDK here
  // For now, this is a template showing the structure

  console.log("\n⚠️  IMPORTANT: This is a template script.");
  console.log("To use this script, you need to:");
  console.log("1. Add Firebase Admin SDK");
  console.log("2. Initialize Firestore with service account");
  console.log("3. Fetch messages from conversations collection");
  console.log("\nExample implementation:\n");

  console.log(`
// Initialize Firebase Admin
import * as admin from 'firebase-admin';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Fetch conversations
const conversationsSnap = await db.collection('conversations').get();
const conversations = conversationsSnap.docs.map(doc => ({
  id: doc.id,
  ...doc.data(),
}));

// For each conversation, fetch messages
for (const conv of conversations) {
  const messagesSnap = await db
    .collection('conversations')
    .doc(conv.id)
    .collection('messages')
    .orderBy('timestamp', 'desc')
    .limit(1000)
    .get();
  
  const messages = messagesSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  
  // Process messages...
}
  `);

  // Demo: Process example messages
  const demoMessages: Message[] = [
    {
      id: "demo-msg-1",
      senderId: "user-1",
      type: "text",
      text: "We need to implement the RAG system for Casper. It should use Pinecone for vector storage and OpenAI for embeddings.",
      timestamp: new Date(),
    },
    {
      id: "demo-msg-2",
      senderId: "user-2",
      type: "text",
      text: "Agreed. Let's also make sure we chunk long messages properly with some overlap.",
      timestamp: new Date(),
    },
  ];

  console.log("\n📝 Processing demo messages...");

  const vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, any>;
  }> = [];

  for (const message of demoMessages) {
    if (message.type !== "text" || !message.text) {
      continue;
    }

    const normalizedText = normalizeText(message.text);
    const chunks = chunkText(normalizedText);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vectorId =
        chunks.length > 1 ? `${message.id}-chunk-${i}` : message.id;

      // Generate embedding
      const [embedding] = await generateEmbeddings(
        [chunk],
        openai,
        config.openai.embeddingModel
      );

      vectors.push({
        id: vectorId,
        values: embedding,
        metadata: {
          cid: conversationId || "demo-conversation",
          mid: message.id,
          text: chunk,
          createdAt: message.timestamp.getTime(),
          userId: message.senderId,
          chunkIndex: i,
        },
      });
    }
  }

  // Upsert to Pinecone
  if (vectors.length > 0) {
    console.log(`\n📤 Upserting ${vectors.length} vectors to Pinecone...`);

    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.namespace(config.pinecone.namespace).upsert(batch);
      console.log(
        `   Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          vectors.length / batchSize
        )}`
      );
    }

    console.log("✓ Vectors upserted successfully");
  }

  // Get stats
  const stats = await index.describeIndexStats();
  console.log("\n📊 Pinecone Index Stats:");
  console.log(`   Total vectors: ${stats.totalRecordCount}`);
  console.log(`   Dimension: ${stats.dimension}`);

  console.log("\n✅ Seed process complete!");
}

// Parse CLI arguments
const args = process.argv.slice(2);
let conversationId: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--cid" && args[i + 1]) {
    conversationId = args[i + 1];
  }
}

// Run
seedRag(conversationId).catch((error) => {
  console.error("\n❌ Error:", error);
  process.exit(1);
});
