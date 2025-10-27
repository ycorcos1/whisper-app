/**
 * Firebase Configuration and Initialization
 * Connects to Firebase Auth, Firestore, Realtime Database, and Storage
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
  initializeFirestore,
} from "firebase/firestore";
import { getDatabase, Database } from "firebase/database";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseUrl,
};

// Validate configuration
const validateConfig = () => {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "appId",
    "databaseURL",
  ];
  const missingKeys = requiredKeys.filter(
    (key) => !firebaseConfig[key as keyof typeof firebaseConfig]
  );

  if (missingKeys.length > 0) {
    console.error("❌ Missing Firebase configuration keys:", missingKeys);
    throw new Error(
      `Missing Firebase configuration: ${missingKeys.join(", ")}`
    );
  }

  // console.log("✅ Firebase configuration validated");
};

// Initialize Firebase app
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let database: Database;
let storage: FirebaseStorage;
let functionsInstance: Functions;

const initializeFirebase = () => {
  try {
    validateConfig();

    // Initialize Firebase App (only once)
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      // console.log("✅ Firebase app initialized");
    } else {
      app = getApps()[0];
      // console.log("✅ Firebase app already initialized");
    }

    // Initialize Firebase Auth with AsyncStorage persistence
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
      // console.log("✅ Firebase Auth initialized with AsyncStorage persistence");
    } catch (error: any) {
      // If auth is already initialized, get the existing instance
      if (error?.code === "auth/already-initialized") {
        auth = getAuth(app);
        // console.log("✅ Firebase Auth already initialized");
      } else {
        throw error;
      }
    }

    // Initialize Firestore with offline persistence
    try {
      firestore = initializeFirestore(app, {
        // Enable offline persistence
        experimentalForceLongPolling: true, // Required for React Native
      });
      // console.log("✅ Firestore initialized with offline persistence");
    } catch (error) {
      const err = error as { code?: string; message?: string };
      if (err?.code === "failed-precondition") {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        firestore = getFirestore(app);
        // console.log(
        //   "⚠️ Firestore initialized without persistence (multi-tab detected)"
        // );
      } else if (err?.message?.includes("already initialized")) {
        firestore = getFirestore(app);
        // console.log("✅ Firestore already initialized");
      } else {
        throw error;
      }
    }

    // Initialize Realtime Database
    database = getDatabase(app);
    // console.log("✅ Realtime Database initialized");

    // Initialize Storage
    storage = getStorage(app);
    // console.log("✅ Storage initialized");

    // Initialize Functions
    functionsInstance = getFunctions(app);
    // console.log("✅ Functions initialized");

    return {
      app,
      auth,
      firestore,
      database,
      storage,
      functions: functionsInstance,
    };
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
    throw error;
  }
};

// Initialize Firebase
const firebase = initializeFirebase();

// Export initialized services
export const firebaseApp = firebase.app;
export const firebaseAuth = firebase.auth;
export const firebaseFirestore = firebase.firestore;
export const firebaseDatabase = firebase.database;
export const firebaseStorage = firebase.storage;
export const functions = firebase.functions;

// Export Firebase SDK modules for use in other files
export {
  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

export type { User } from "firebase/auth";

export {
  // Firestore
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

export type {
  DocumentReference,
  CollectionReference,
  QuerySnapshot,
  DocumentSnapshot,
} from "firebase/firestore";

export {
  // Realtime Database
  ref,
  set,
  get,
  onValue,
  onDisconnect,
  push,
  remove,
  update,
} from "firebase/database";

export {
  // Storage
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export {
  // Functions
  httpsCallable,
} from "firebase/functions";

// Export config for reference
export { firebaseConfig };

export default firebase;
