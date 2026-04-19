import admin from "firebase-admin";
import { env } from "./env";

let adminApp: admin.app.App | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;

const hasFirebaseCredentials = env.firebaseProjectId && env.firebasePrivateKey && env.firebaseClientEmail;

if (hasFirebaseCredentials) {
  try {
    adminApp = admin.app();
  } catch (error) {
    try {
      adminApp = admin.initializeApp({
        projectId: env.firebaseProjectId,
        credential: admin.credential.cert({
          projectId: env.firebaseProjectId,
          privateKey: env.firebasePrivateKey?.replace(/\\n/g, "\n"),
          clientEmail: env.firebaseClientEmail
        } as admin.ServiceAccount)
      });
    } catch (initError) {
      console.warn("Failed to initialize Firebase Admin:", initError);
      adminApp = null;
    }
  }

  if (adminApp) {
    adminAuth = admin.auth(adminApp);
    adminDb = admin.firestore(adminApp);
  }
} else {
  console.warn("Firebase credentials not configured. Authentication features will be disabled.");
}

export { adminAuth, adminDb };
export const isFirebaseEnabled = adminApp !== null;
