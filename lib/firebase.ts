import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId,
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!auth) auth = getAuth(app);
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) throw new Error("Firebase is not configured");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(firebaseAuth, provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) await firebaseSignOut(firebaseAuth);
}

export async function getIdToken(): Promise<string | null> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth?.currentUser) return null;
  return firebaseAuth.currentUser.getIdToken();
}
