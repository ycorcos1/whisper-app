/**
 * Cache Clear Utility
 * Use this to clear Casper caches when testing
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export async function clearAllCasperCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const casperKeys = keys.filter((k) => k.startsWith("casper:"));

    if (casperKeys.length > 0) {
      await AsyncStorage.multiRemove(casperKeys);
    }
  } catch (error) {
    console.error("Error clearing Casper caches:", error);
  }
}

export async function clearActionCache(cid: string): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `casper:actions:${cid}:${today}`;
    await AsyncStorage.removeItem(key);

    // Also clear global cache if no conversation context
    if (!cid) {
      const globalKeys = await AsyncStorage.getAllKeys();
      const actionGlobalKeys = globalKeys.filter((k) =>
        k.startsWith("casper:actions:global:")
      );
      if (actionGlobalKeys.length > 0) {
        await AsyncStorage.multiRemove(actionGlobalKeys);
      }
    }
  } catch (error) {
    console.error("Error clearing action cache:", error);
  }
}

export async function clearDecisionCache(cid: string): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `casper:decisions:${cid}:${today}`;
    await AsyncStorage.removeItem(key);

    // Also clear global cache if no conversation context
    if (!cid) {
      const globalKeys = await AsyncStorage.getAllKeys();
      const decisionGlobalKeys = globalKeys.filter((k) =>
        k.startsWith("casper:decisions:global:")
      );
      if (decisionGlobalKeys.length > 0) {
        await AsyncStorage.multiRemove(decisionGlobalKeys);
      }
    }
  } catch (error) {
    console.error("Error clearing decision cache:", error);
  }
}
