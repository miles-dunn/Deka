import { initializeApp, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics = null;

if (hasFirebaseConfig) {
  try {
    app = getApp();
  } catch (error) {
    app = initializeApp(firebaseConfig);
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Initialize Analytics if measurementId is present
  if (firebaseConfig.measurementId && typeof window !== "undefined") {
    analytics = getAnalytics(app);
  }

  // Enable emulator in development (optional)
  // if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  //   try {
  //     connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  //     connectFirestoreEmulator(db, "localhost", 8080);
  //   } catch (error) {
  //     // Emulator already connected or not available
  //   }
  // }
} else {
  console.warn("Firebase configuration not found. Authentication features will be disabled.");
}

export { auth, db, storage, analytics };
export const isFirebaseEnabled = Boolean(hasFirebaseConfig && app !== undefined);
