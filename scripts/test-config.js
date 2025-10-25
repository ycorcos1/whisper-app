/**
 * Quick configuration test
 * Tests if API keys are present
 */

require("dotenv").config();

console.log("\n🔍 Checking Casper RAG Configuration...\n");

const checks = [
  { name: "OPENAI_API_KEY", value: process.env.OPENAI_API_KEY },
  { name: "PINECONE_API_KEY", value: process.env.PINECONE_API_KEY },
  { name: "PINECONE_INDEX", value: process.env.PINECONE_INDEX },
  { name: "PINECONE_ENV", value: process.env.PINECONE_ENV },
];

let allGood = true;

checks.forEach((check) => {
  const hasValue = check.value && check.value.trim().length > 0;
  const isPlaceholder =
    check.value &&
    (check.value.includes("your-key-here") ||
      check.value.includes("sk-your-key-here"));

  if (!hasValue) {
    console.log(`❌ ${check.name}: Missing`);
    allGood = false;
  } else if (isPlaceholder) {
    console.log(`⚠️  ${check.name}: Placeholder (needs real API key)`);
    allGood = false;
  } else {
    console.log(`✅ ${check.name}: Set (${check.value.substring(0, 8)}...)`);
  }
});

console.log("\n" + "=".repeat(60));

if (allGood) {
  console.log("✅ Configuration looks good!");
  console.log("\nNext step: Run npm run rag:validate");
} else {
  console.log("❌ Configuration incomplete\n");
  console.log("📝 You need to:");
  console.log("1. Get real API keys from:");
  console.log("   - OpenAI: https://platform.openai.com/api-keys");
  console.log("   - Pinecone: https://app.pinecone.io");
  console.log("2. Replace the placeholder values in .env");
  console.log("3. Create Pinecone index: whisper-casper (1536 dimensions)");
  console.log("4. Restart any running processes");
  console.log("5. Run this script again\n");
}

console.log("=".repeat(60) + "\n");
