// Firebase Web SDK — phone OTP only. The verified Firebase ID token is exchanged
// for a Supabase session via the `firebase-bridge` edge function, so the rest of
// the app keeps using the Supabase user / profile / RLS model unchanged.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";

type Cfg = { apiKey: string; authDomain: string; projectId: string; appId: string };

let _cfg: Cfg | null = null;
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _verifier: RecaptchaVerifier | null = null;
let _cfgPromise: Promise<Cfg> | null = null;

async function loadConfig(): Promise<Cfg> {
  if (_cfg) return _cfg;
  if (_cfgPromise) return _cfgPromise;
  _cfgPromise = (async () => {
    const { data, error } = await supabase.functions.invoke<Cfg>("firebase-config");
    if (error || !data?.apiKey) {
      throw new Error("Firebase is not configured on the server yet.");
    }
    _cfg = data;
    return data;
  })();
  return _cfgPromise;
}

export async function getFirebase(): Promise<{ app: FirebaseApp; auth: Auth }> {
  const cfg = await loadConfig();
  if (!_app) _app = getApps().length ? getApp() : initializeApp(cfg);
  if (!_auth) _auth = getAuth(_app);
  return { app: _app, auth: _auth };
}

export async function getRecaptcha(containerId = "recaptcha-container"): Promise<RecaptchaVerifier> {
  const { auth } = await getFirebase();
  if (_verifier) return _verifier;
  _verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return _verifier;
}

export function resetRecaptcha() {
  try { _verifier?.clear(); } catch { /* noop */ }
  _verifier = null;
}

export async function sendFirebasePhoneOtp(phoneE164: string): Promise<ConfirmationResult> {
  const { auth } = await getFirebase();
  const verifier = await getRecaptcha();
  return await signInWithPhoneNumber(auth, phoneE164, verifier);
}
