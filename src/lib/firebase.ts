import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCQ9fNVTxXmjrLeBwOxN4LXvvU8YpyFUQ0",
  authDomain: "gen-lang-client-0695457607.firebaseapp.com",
  projectId: "gen-lang-client-0695457607",
  storageBucket: "gen-lang-client-0695457607.firebasestorage.app",
  messagingSenderId: "556101700733",
  appId: "1:556101700733:android:0b371bf9431b1f24cdb514"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
