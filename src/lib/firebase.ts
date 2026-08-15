import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCDFm516Yy7E82He3xaZp5jYtIUJLkiPtI",
  authDomain: "social-claud.firebaseapp.com",
  projectId: "social-claud",
  storageBucket: "social-claud.firebasestorage.app",
  messagingSenderId: "611057820540",
  appId: "1:611057820540:web:7d0462c6bd7628a679baf9",
  measurementId: "G-8LJJMQ1DJ5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();

export default app;
