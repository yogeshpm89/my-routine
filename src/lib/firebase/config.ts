import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

function cleanEnv(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  const hashIdx = trimmed.indexOf('#');
  if (hashIdx > 0 && !trimmed.startsWith('"') && !trimmed.startsWith("'")) {
    return trimmed.substring(0, hashIdx).trim();
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

const firebaseConfig = {
  apiKey: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: cleanEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('YOUR_API_KEY') &&
  !firebaseConfig.apiKey.includes('mock-api-key') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('my-routine-dev') &&
  firebaseConfig.appId &&
  !firebaseConfig.appId.includes('YOUR_APP_ID')
);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  try {
    if (typeof window !== 'undefined') {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } else {
      db = getFirestore(app);
    }
  } catch {
    try {
      db = getFirestore(app);
    } catch {
      db = {} as Firestore;
    }
  }
} else {
  app = getApp();
  try {
    db = getFirestore(app);
  } catch {
    db = {} as Firestore;
  }
}

try {
  auth = getAuth(app);
} catch {
  auth = {} as Auth;
}

export function canSyncWithFirestore(userId?: string): boolean {
  if (
    !isFirebaseConfigured ||
    !db ||
    !userId ||
    userId === 'local-default-user' ||
    userId.startsWith('guest-') ||
    userId.startsWith('user_')
  ) {
    return false;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    return Boolean(
      auth?.currentUser &&
      !auth.currentUser.isAnonymous &&
      auth.currentUser.uid === userId
    );
  } catch {
    return false;
  }
}

export { app, auth, db };
