import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCKWXHKPhXwTJoIuLqLV7NlfKCJ-SMmWTw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "social-claud.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "social-claud",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "social-claud.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "611057820540",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:611057820540:web:8bef290ee0f88bac79baf9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export default app;
