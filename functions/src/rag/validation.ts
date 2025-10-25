/**
 * RAG Validation & QA Test
 * Confirms recall quality and end-to-end pipeline functionality
 */

import {
  searchVectors,
  upsertVectors,
  VectorMetadata,
  getIndexStats,
} from "./index";
import { generateEmbedding, normalizeText } from "./embed";
import { testRagPipeline } from "./answer";
import { isRagConfigured } from "./config";

/**
 * Test data for validation
 */
const testMessages = [
  {
    id: "test-msg-1",
    cid: "test-conversation",
    text: "We decided to use Pinecone for vector storage because it has a generous free tier and good performance.",
    userId: "user-1",
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
  {
    id: "test-msg-2",
    cid: "test-conversation",
    text: "The deadline for PR 3 is Friday. Make sure to test the embedding generation thoroughly.",
    userId: "user-2",
    timestamp: Date.now() - 1800000, // 30 minutes ago
  },
  {
    id: "test-msg-3",
    cid: "test-conversation",
    text: "I completed the OpenAI integration. The API calls are working well with the text-embedding-3-small model.",
    userId: "user-1",
    timestamp: Date.now() - 900000, // 15 minutes ago
  },
  {
    id: "test-msg-4",
    cid: "test-conversation",
    text: "Great work! Let's also add error handling for rate limits and network failures.",
    userId: "user-3",
    timestamp: Date.now() - 300000, // 5 minutes ago
  },
];

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  steps: Array<{
    name: string;
    passed: boolean;
    message: string;
    details?: any;
  }>;
  errors: string[];
}

/**
 * Run comprehensive validation of RAG pipeline
 */
export async function validateRagSystem(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: false,
    steps: [],
    errors: [],
  };

  try {
    // Step 1: Check configuration
    console.log("📋 Step 1: Validating configuration...");
    const configValid = isRagConfigured();
    result.steps.push({
      name: "Configuration",
      passed: configValid,
      message: configValid
        ? "All required environment variables are set"
        : "Missing required environment variables",
    });

    if (!configValid) {
      result.errors.push("Configuration validation failed");
      return result;
    }

    // Step 2: Test embedding generation
    console.log("📋 Step 2: Testing embedding generation...");
    try {
      const testText = "This is a test message for embedding generation.";
      const embedding = await generateEmbedding(testText);

      const embeddingValid =
        Array.isArray(embedding) && embedding.length === 1536;
      result.steps.push({
        name: "Embedding Generation",
        passed: embeddingValid,
        message: embeddingValid
          ? `Generated ${embedding.length}-dimensional embedding`
          : `Invalid embedding: expected 1536 dimensions, got ${embedding.length}`,
        details: { dimensions: embedding.length },
      });

      if (!embeddingValid) {
        result.errors.push("Embedding generation failed");
      }
    } catch (error) {
      result.steps.push({
        name: "Embedding Generation",
        passed: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      result.errors.push("Embedding generation failed");
    }

    // Step 3: Test vector upsert
    console.log("📋 Step 3: Testing vector upsert...");
    try {
      const vectors = await Promise.all(
        testMessages.map(async (msg) => {
          const text = normalizeText(msg.text);
          const embedding = await generateEmbedding(text);

          return {
            id: msg.id,
            embedding,
            metadata: {
              cid: msg.cid,
              mid: msg.id,
              text,
              createdAt: msg.timestamp,
              userId: msg.userId,
            } as VectorMetadata,
          };
        })
      );

      await upsertVectors(vectors);

      result.steps.push({
        name: "Vector Upsert",
        passed: true,
        message: `Successfully upserted ${vectors.length} test vectors`,
        details: { vectorCount: vectors.length },
      });
    } catch (error) {
      result.steps.push({
        name: "Vector Upsert",
        passed: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      result.errors.push("Vector upsert failed");
    }

    // Step 4: Test vector search
    console.log("📋 Step 4: Testing vector search...");
    try {
      const query = "What vector database are we using?";
      const searchResults = await searchVectors(query, "test-conversation", 3);

      const searchValid = searchResults.length > 0;
      const hasRelevantResult = searchResults.some((r) =>
        r.metadata.text.toLowerCase().includes("pinecone")
      );

      result.steps.push({
        name: "Vector Search",
        passed: searchValid && hasRelevantResult,
        message:
          searchValid && hasRelevantResult
            ? `Found ${searchResults.length} results, including relevant matches`
            : searchValid
            ? `Found ${searchResults.length} results but relevance is low`
            : "No results found",
        details: {
          resultCount: searchResults.length,
          topScore: searchResults[0]?.score || 0,
        },
      });

      if (!searchValid) {
        result.errors.push("Vector search failed");
      }
    } catch (error) {
      result.steps.push({
        name: "Vector Search",
        passed: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      result.errors.push("Vector search failed");
    }

    // Step 5: Test Q&A generation
    console.log("📋 Step 5: Testing Q&A generation...");
    try {
      const testResult = await testRagPipeline(
        "What is the deadline for PR 3?",
        "test-conversation"
      );

      const qaValid = testResult.success && testResult.answer.length > 0;
      const hasDeadline = testResult.answer.toLowerCase().includes("friday");

      result.steps.push({
        name: "Q&A Generation",
        passed: qaValid && hasDeadline,
        message:
          qaValid && hasDeadline
            ? "Successfully generated relevant answer with correct information"
            : qaValid
            ? "Generated answer but relevance is questionable"
            : "Q&A generation failed",
        details: {
          answerLength: testResult.answer.length,
          sourceCount: testResult.results.length,
        },
      });

      if (!qaValid) {
        result.errors.push("Q&A generation failed");
      }
    } catch (error) {
      result.steps.push({
        name: "Q&A Generation",
        passed: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      result.errors.push("Q&A generation failed");
    }

    // Step 6: Check index stats
    console.log("📋 Step 6: Checking index stats...");
    try {
      const stats = await getIndexStats();

      result.steps.push({
        name: "Index Stats",
        passed: true,
        message: `Index has ${stats.totalRecordCount} total vectors`,
        details: {
          totalVectors: stats.totalRecordCount,
          dimension: stats.dimension,
        },
      });
    } catch (error) {
      result.steps.push({
        name: "Index Stats",
        passed: false,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      // This is not critical, so don't add to errors
    }

    // Determine overall success
    result.success = result.errors.length === 0;
  } catch (error) {
    result.errors.push(
      `Unexpected error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  return result;
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 RAG VALIDATION RESULTS");
  console.log("=".repeat(60) + "\n");

  result.steps.forEach((step, index) => {
    const icon = step.passed ? "✅" : "❌";
    console.log(`${icon} ${index + 1}. ${step.name}`);
    console.log(`   ${step.message}`);
    if (step.details) {
      console.log(`   Details:`, step.details);
    }
    console.log("");
  });

  console.log("=".repeat(60));

  if (result.success) {
    console.log("✅ ALL TESTS PASSED");
  } else {
    console.log("❌ VALIDATION FAILED");
    console.log("\nErrors:");
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }

  console.log("=".repeat(60) + "\n");
}

/**
 * Quick recall quality test
 * Tests if the system can accurately retrieve relevant information
 */
export async function testRecallQuality(): Promise<{
  score: number;
  details: string;
}> {
  const queries = [
    { query: "vector database", expectedTerm: "pinecone" },
    { query: "deadline", expectedTerm: "friday" },
    { query: "OpenAI model", expectedTerm: "embedding" },
  ];

  let hits = 0;
  const details: string[] = [];

  for (const { query, expectedTerm } of queries) {
    try {
      const results = await searchVectors(query, "test-conversation", 3);
      const hasMatch = results.some((r) =>
        r.metadata.text.toLowerCase().includes(expectedTerm.toLowerCase())
      );

      if (hasMatch) {
        hits++;
        details.push(`✓ "${query}" → found "${expectedTerm}"`);
      } else {
        details.push(`✗ "${query}" → missing "${expectedTerm}"`);
      }
    } catch (error) {
      details.push(`✗ "${query}" → error`);
    }
  }

  const score = hits / queries.length;

  return {
    score,
    details: details.join("\n"),
  };
}
