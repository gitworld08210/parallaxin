import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCKWXHKPhXwTJoIuLqLV7NlfKCJ-SMmWTw",
  authDomain: "social-claud.firebaseapp.com",
  projectId: "social-claud",
  storageBucket: "social-claud.firebasestorage.app",
  messagingSenderId: "611057820540",
  appId: "1:611057820540:web:8bef290ee0f88bac79baf9" // Fixed appId for web
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export default app;
