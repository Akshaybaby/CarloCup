import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// FIREBASE CONFIGURATION KEYS
// ==========================================
// Paste your Firebase Web Config values below.
// You can get these from your Firebase Console under Project Settings -> General -> Web Apps.
const firebaseConfig = {
  apiKey: "PLACEHOLDER_API_KEY",
  authDomain: "PLACEHOLDER_AUTH_DOMAIN",
  projectId: "PLACEHOLDER_PROJECT_ID",
  storageBucket: "PLACEHOLDER_STORAGE_BUCKET",
  messagingSenderId: "PLACEHOLDER_MESSAGING_SENDER_ID",
  appId: "PLACEHOLDER_APP_ID"
};

// Check if keys have been customized by the developer
export const isFirebaseConfigured = 
  firebaseConfig.apiKey !== "PLACEHOLDER_API_KEY" && 
  firebaseConfig.apiKey !== "" &&
  !firebaseConfig.apiKey.startsWith("PLACEHOLDER");

let app: any = null;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      app = getApp();
      auth = getAuth(app);
    }
    db = getFirestore(app);
  } catch (error) {
    console.warn("Firebase failed to initialize. Falling back to local storage mode.", error);
    app = null;
    auth = null;
    db = null;
  }
}

export { app, auth, db };
