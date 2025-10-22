import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Load environment variables
  const apiKey = process.env.FIREBASE_API_KEY || "";
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN || "";
  const projectId = process.env.FIREBASE_PROJECT_ID || "";
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "";
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || "";
  const appId = process.env.FIREBASE_APP_ID || "";
  const databaseUrl = process.env.FIREBASE_DATABASE_URL || "";
  const schemaVersion = process.env.APP_STATE_SCHEMA_VERSION || "1";

  return {
    ...config,
    name: "Whisper",
    slug: "whisper-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1B1325",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.whisper.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1B1325",
      },
      package: "com.whisper.app",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      firebaseApiKey: apiKey,
      firebaseAuthDomain: authDomain,
      firebaseProjectId: projectId,
      firebaseStorageBucket: storageBucket,
      firebaseMessagingSenderId: messagingSenderId,
      firebaseAppId: appId,
      firebaseDatabaseUrl: databaseUrl,
      appStateSchemaVersion: schemaVersion,
    },
    plugins: ["expo-image-picker"],
  };
};
