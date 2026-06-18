// Firebase Web SDK — phone OTP only. Verified token is exchanged for a Supabase
// session via the `firebase-bridge` edge function, so all other backend code
// continues to use the existing Supabase user/profile/RLS model.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

export function getFirebase(): { app: FirebaseApp; auth: Auth } {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      "Firebase is not configured in the frontend. Add VITE_FIREBASE_* env vars."
    );
  }
  if (!_app) _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!_auth) _auth = getAuth(_app);
  return { app: _app, auth: _auth };
}

let _verifier: RecaptchaVerifier | null = null;

export function getRecaptcha(containerId = "recaptcha-container"): RecaptchaVerifier {
  const { auth } = getFirebase();
  if (_verifier) return _verifier;
  _verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return _verifier;
}

export function resetRecaptcha() {
  try { _verifier?.clear(); } catch { /* noop */ }
  _verifier = null;
}

export async function sendFirebasePhoneOtp(phoneE164: string): Promise<ConfirmationResult> {
  const { auth } = getFirebase();
  const verifier = getRecaptcha();
  return await signInWithPhoneNumber(auth, phoneE164, verifier);
}
