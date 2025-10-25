/**
 * Validation script runner
 * Runs the RAG validation suite and prints results
 */

async function main() {
  console.log("Starting RAG validation...\n");

  try {
    // Dynamic import to handle ES modules
    const validation = await import("../functions/src/rag/validation.js");
    const result = await validation.validateRagSystem();
    validation.printValidationResults(result);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("Fatal error during validation:");
    console.error(error);
    process.exit(1);
  }
}

main();
