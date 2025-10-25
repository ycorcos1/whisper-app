/**
 * Simple RAG Validation
 * Tests basic functionality without complex TypeScript imports
 */

require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");
const OpenAI = require("openai").default;

console.log("\n" + "=".repeat(60));
console.log("📊 RAG VALIDATION - SIMPLE TEST");
console.log("=".repeat(60) + "\n");

const results = [];

async function validate() {
  // Step 1: Configuration
  console.log("📋 Step 1: Checking configuration...");
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasPinecone = !!process.env.PINECONE_API_KEY;
  const hasIndex = !!process.env.PINECONE_INDEX;

  if (hasOpenAI && hasPinecone && hasIndex) {
    console.log("   ✅ All required environment variables are set\n");
    results.push({ step: "Configuration", passed: true });
  } else {
    console.log("   ❌ Missing environment variables\n");
    results.push({ step: "Configuration", passed: false });
    return false;
  }

  // Step 2: Test OpenAI Embeddings
  console.log("📋 Step 2: Testing OpenAI embeddings...");
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "This is a test message",
    });

    const dimensions = response.data[0].embedding.length;
    if (dimensions === 1536) {
      console.log(`   ✅ Generated ${dimensions}-dimensional embedding\n`);
      results.push({ step: "Embedding Generation", passed: true });
    } else {
      console.log(`   ❌ Wrong dimensions: ${dimensions} (expected 1536)\n`);
      results.push({ step: "Embedding Generation", passed: false });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    results.push({ step: "Embedding Generation", passed: false });
  }

  // Step 3: Test Pinecone Connection
  console.log("📋 Step 3: Testing Pinecone connection...");
  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.index(
      process.env.PINECONE_INDEX || "whisper-casper"
    );

    const stats = await index.describeIndexStats();
    console.log(`   ✅ Connected to Pinecone`);
    console.log(`   📊 Total vectors: ${stats.totalRecordCount}`);
    console.log(`   📊 Dimension: ${stats.dimension}\n`);
    results.push({ step: "Pinecone Connection", passed: true });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    results.push({ step: "Pinecone Connection", passed: false });
  }

  return true;
}

// Run validation
validate()
  .then(() => {
    console.log("=".repeat(60));
    console.log("📊 RESULTS");
    console.log("=".repeat(60) + "\n");

    results.forEach((result, i) => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${i + 1}. ${result.step}`);
    });

    const allPassed = results.every((r) => r.passed);
    console.log("\n" + "=".repeat(60));
    if (allPassed) {
      console.log("✅ ALL TESTS PASSED");
      console.log("\n🎉 Your RAG system is configured correctly!");
      console.log("\nNext steps:");
      console.log('1. Run "npm run rag:seed" to add test data');
      console.log("2. Open the app and tap the Casper ghost button");
      console.log("3. Try the Ask tab to ask questions\n");
    } else {
      console.log("❌ SOME TESTS FAILED");
      console.log("\nPlease fix the errors above and try again.\n");
    }
    console.log("=".repeat(60) + "\n");

    process.exit(allPassed ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
