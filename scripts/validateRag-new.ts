/**
 * Validation script runner
 * Runs the RAG validation suite and prints results
 */

// This will be compiled to CommonJS by ts-node
import {
  validateRagSystem,
  printValidationResults,
} from "../src/server/rag/validation";

async function main() {
  console.log("Starting RAG validation...\n");

  try {
    const result = await validateRagSystem();
    printValidationResults(result);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("\nFatal error during validation:");
    console.error(error);
    process.exit(1);
  }
}

main();
