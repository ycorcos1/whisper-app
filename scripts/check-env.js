#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Ensures all required Firebase configuration variables are set before running the app.
 * Used in CI/CD pipeline and local development.
 */

const fs = require("fs");
const path = require("path");

const requiredVars = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
  "FIREBASE_DATABASE_URL",
];

function checkEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");

  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found");
    console.log("📝 Please create a .env file from .env.example:");
    console.log("   cp .env.example .env");
    console.log("   Then fill in your Firebase configuration values.");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  const missing = [];

  requiredVars.forEach((varName) => {
    const regex = new RegExp(`^${varName}=(.+)$`, "m");
    const match = envContent.match(regex);

    if (!match || match[1].includes("your_") || match[1].trim() === "") {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error("❌ Error: Missing or invalid environment variables:");
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.log(
      "\n📝 Please update your .env file with valid Firebase configuration values."
    );
    console.log(
      "   Get these from: Firebase Console > Project Settings > Your Apps > Web App"
    );
    process.exit(1);
  }

  console.log("✅ All required environment variables are configured");
}

// Run the check
checkEnvFile();
