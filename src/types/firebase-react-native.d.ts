declare module "firebase/auth/react-native" {
  import type { Persistence } from "firebase/auth";
  // Minimal typing to satisfy TS in RN/Expo projects.
  export function getReactNativePersistence(storage: unknown): Persistence;
}

// Augment firebase/auth to include the RN helper for TypeScript, without
// pulling in conditional type paths that some TS setups miss.
declare module "firebase/auth" {
  export * from "@firebase/auth";
  export function getReactNativePersistence(
    storage: unknown
  ): import("@firebase/auth").Persistence;
}
