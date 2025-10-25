/**
 * Validation script runner
 * Runs the RAG validation suite and prints results
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("Starting RAG validation...\n");

try {
  // First compile TypeScript, then run the validation
  const tsNodePath = path.join(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    "ts-node"
  );

  // Use ts-node with explicit configuration
  execSync(
    `${tsNodePath} --transpile-only -e "
    const validation = require('./src/server/rag/validation');
    validation.validateRagSystem()
      .then(r => {
        validation.printValidationResults(r);
        process.exit(r.success ? 0 : 1);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  "`,
    {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(__dirname, "..", "tsconfig.json"),
      },
    }
  );
} catch (error) {
  console.error("Fatal error during validation:");
  console.error(error.message);
  process.exit(1);
}
