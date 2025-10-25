/**
 * Casper Data Hooks
 * Cache-first Firestore hooks for reading Casper AI agent data
 * PR 2: Read-only implementation with skeleton UI support
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../state/auth/useAuth";
import {
  firebaseFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
} from "../lib/firebase";
import {
  Insight,
  Task,
  Digest,
  AgentPreferences,
  InsightType,
} from "../types/casper";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache keys for AsyncStorage
const CACHE_KEYS = {
  insights: (cid: string, type: InsightType) =>
    `casper:insights:${cid}:${type}`,
  tasks: (uid: string) => `casper:tasks:${uid}`,
  digest: (uid: string) => `casper:digest:${uid}`,
  agentPrefs: (uid: string) => `casper:agent:${uid}`,
};

/**
 * Generic hook result type
 */
interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch insights for a conversation
 * Cache-first: loads from AsyncStorage, then subscribes to Firestore
 */
export function useInsights(
  cid: string | undefined,
  type: InsightType
): UseDataResult<Insight[]> {
  const [data, setData] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    if (!cid) return null;
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.insights(cid, type));
      if (cached) {
        return JSON.parse(cached) as Insight[];
      }
    } catch (err) {
      console.warn("Error loading insights from cache:", err);
    }
    return null;
  }, [cid, type]);

  const saveToCache = useCallback(
    async (insights: Insight[]) => {
      if (!cid) return;
      try {
        await AsyncStorage.setItem(
          CACHE_KEYS.insights(cid, type),
          JSON.stringify(insights)
        );
      } catch (err) {
        console.warn("Error saving insights to cache:", err);
      }
    },
    [cid, type]
  );

  const refetch = useCallback(async () => {
    if (!cid) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load from cache first
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
        setLoading(false); // Show cached data immediately
      }

      // Then fetch from Firestore
      const insightsRef = collection(
        firebaseFirestore,
        "assist",
        "insights",
        cid
      );
      const q = query(
        insightsRef,
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(10)
      );

      const snapshot = await getDocs(q);
      const insights: Insight[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        cid,
        ...(doc.data() as Omit<Insight, "id" | "cid">),
      }));

      setData(insights);
      await saveToCache(insights);
    } catch (err: any) {
      console.error("Error fetching insights:", err);
      setError(err.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, [cid, type, loadFromCache, saveToCache]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/**
 * Hook to fetch tasks for the current user
 * Cache-first: loads from AsyncStorage, then subscribes to Firestore
 */
export function useTasks(): UseDataResult<Task[]> {
  const { user } = useAuth();
  const [data, setData] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    if (!user?.uid) return null;
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.tasks(user.uid));
      if (cached) {
        return JSON.parse(cached) as Task[];
      }
    } catch (err) {
      console.warn("Error loading tasks from cache:", err);
    }
    return null;
  }, [user?.uid]);

  const saveToCache = useCallback(
    async (tasks: Task[]) => {
      if (!user?.uid) return;
      try {
        await AsyncStorage.setItem(
          CACHE_KEYS.tasks(user.uid),
          JSON.stringify(tasks)
        );
      } catch (err) {
        console.warn("Error saving tasks to cache:", err);
      }
    },
    [user?.uid]
  );

  const refetch = useCallback(async () => {
    if (!user?.uid) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load from cache first
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
        setLoading(false); // Show cached data immediately
      }

      // Then fetch from Firestore
      const tasksRef = collection(
        firebaseFirestore,
        "assist",
        "tasks",
        user.uid
      );
      const q = query(tasksRef, orderBy("createdAt", "desc"), limit(50));

      const snapshot = await getDocs(q);
      const tasks: Task[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Task, "id">),
      }));

      setData(tasks);
      await saveToCache(tasks);
    } catch (err: any) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loadFromCache, saveToCache]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/**
 * Hook to fetch the latest daily digest for the current user
 * Cache-first: loads from AsyncStorage, then subscribes to Firestore
 */
export function useDigest(): UseDataResult<Digest> {
  const { user } = useAuth();
  const [data, setData] = useState<Digest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    if (!user?.uid) return null;
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.digest(user.uid));
      if (cached) {
        return JSON.parse(cached) as Digest;
      }
    } catch (err) {
      console.warn("Error loading digest from cache:", err);
    }
    return null;
  }, [user?.uid]);

  const saveToCache = useCallback(
    async (digest: Digest) => {
      if (!user?.uid) return;
      try {
        await AsyncStorage.setItem(
          CACHE_KEYS.digest(user.uid),
          JSON.stringify(digest)
        );
      } catch (err) {
        console.warn("Error saving digest to cache:", err);
      }
    },
    [user?.uid]
  );

  const refetch = useCallback(async () => {
    if (!user?.uid) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load from cache first
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
        setLoading(false); // Show cached data immediately
      }

      // Then fetch from Firestore - get the latest digest
      const digestsRef = collection(
        firebaseFirestore,
        "assist",
        "digests",
        user.uid
      );
      const q = query(digestsRef, orderBy("createdAt", "desc"), limit(1));

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setData(null);
      } else {
        const digestDoc = snapshot.docs[0];
        const digest: Digest = {
          id: digestDoc.id,
          ...(digestDoc.data() as Omit<Digest, "id">),
        };
        setData(digest);
        await saveToCache(digest);
      }
    } catch (err: any) {
      console.error("Error fetching digest:", err);
      setError(err.message || "Failed to load digest");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loadFromCache, saveToCache]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/**
 * Hook to fetch agent preferences for the current user
 * Cache-first: loads from AsyncStorage, then subscribes to Firestore
 */
export function useAgentPreferences(): UseDataResult<AgentPreferences> {
  const { user } = useAuth();
  const [data, setData] = useState<AgentPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async () => {
    if (!user?.uid) return null;
    try {
      const cached = await AsyncStorage.getItem(
        CACHE_KEYS.agentPrefs(user.uid)
      );
      if (cached) {
        return JSON.parse(cached) as AgentPreferences;
      }
    } catch (err) {
      console.warn("Error loading agent preferences from cache:", err);
    }
    return null;
  }, [user?.uid]);

  const saveToCache = useCallback(
    async (prefs: AgentPreferences) => {
      if (!user?.uid) return;
      try {
        await AsyncStorage.setItem(
          CACHE_KEYS.agentPrefs(user.uid),
          JSON.stringify(prefs)
        );
      } catch (err) {
        console.warn("Error saving agent preferences to cache:", err);
      }
    },
    [user?.uid]
  );

  const refetch = useCallback(async () => {
    if (!user?.uid) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load from cache first
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
        setLoading(false); // Show cached data immediately
      }

      // Then fetch from Firestore
      const agentDocRef = doc(firebaseFirestore, "assist", "agents", user.uid);
      const agentDoc = await getDoc(agentDocRef);

      if (agentDoc.exists()) {
        const prefs: AgentPreferences = {
          uid: user.uid,
          ...(agentDoc.data() as Omit<AgentPreferences, "uid">),
        };
        setData(prefs);
        await saveToCache(prefs);
      } else {
        // Return default preferences if document doesn't exist
        const defaultPrefs: AgentPreferences = {
          uid: user.uid,
          proactiveEnabled: false,
        };
        setData(defaultPrefs);
      }
    } catch (err: any) {
      console.error("Error fetching agent preferences:", err);
      setError(err.message || "Failed to load agent preferences");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loadFromCache, saveToCache]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
