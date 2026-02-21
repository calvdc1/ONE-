import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const envConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
} as const;

const defaultProdConfig = {
  apiKey: "AIzaSyAoHycd0hlQeSy5_G4NLSNdOGCN8bNpwko",
  authDomain: "onemsu-app.firebaseapp.com",
  projectId: "onemsu-app",
  storageBucket: "onemsu-app.appspot.com",
  messagingSenderId: "1093174130695",
  appId: "1:1093174130695:web:cf7780500857a29f5b92a2",
} as const;

let firebaseConfig = envConfig;
try {
  const host =
    typeof window !== "undefined"
      ? window.location.hostname
      : (process.env.RAILWAY_STATIC_URL || process.env.VERCEL_URL || "");
  const onProdHost = Boolean(host && (host.includes("railway.app") || host.includes("onemsu")));
  const missingEnv = envConfig.apiKey === "YOUR_API_KEY";
  if (onProdHost && missingEnv) {
    firebaseConfig = defaultProdConfig;
  }
} catch {
  firebaseConfig = envConfig;
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
