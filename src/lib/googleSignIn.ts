import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { getPlugin, isNativeApp } from "@/lib/native";

interface NativeGoogleResult {
  credential?: { idToken?: string | null; accessToken?: string | null } | null;
}

interface FirebaseAuthenticationPlugin {
  signInWithGoogle: () => Promise<NativeGoogleResult>;
}

export interface GoogleSignInOutcome {
  /** Signed-in user, or null when a redirect was started and will finish later. */
  user: User | null;
  /** True when the app navigated away to complete sign-in. */
  redirecting: boolean;
}

/**
 * Signs in with Google on both web and Android.
 *
 * `signInWithPopup` cannot be used inside the Capacitor WebView: there is no
 * opener relationship for the popup to report back through, so the call hangs
 * or is blocked outright. Three strategies are tried in order of reliability:
 *
 *  1. Web -> popup, which is the best desktop/mobile-browser experience.
 *  2. Native with `@capacitor-firebase/authentication` -> the Google account
 *     picker runs natively and returns an ID token we exchange for a Firebase
 *     credential. This is the supported production path on Android.
 *  3. Native without that plugin -> full-page redirect. It works, but the
 *     result arrives on the next app load, so callers must also consume
 *     `consumePendingGoogleSignIn()` on mount.
 */
export const signInWithGoogleSmart = async (): Promise<GoogleSignInOutcome> => {
  if (!isNativeApp()) {
    const res = await signInWithPopup(auth, googleProvider);
    return { user: res.user, redirecting: false };
  }

  const nativeAuth = getPlugin<FirebaseAuthenticationPlugin>("FirebaseAuthentication");
  if (nativeAuth) {
    const result = await nativeAuth.signInWithGoogle();
    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error("Google sign-in did not return an ID token");

    const credential = GoogleAuthProvider.credential(idToken, result?.credential?.accessToken ?? undefined);
    const res = await signInWithCredential(auth, credential);
    return { user: res.user, redirecting: false };
  }

  await signInWithRedirect(auth, googleProvider);
  return { user: null, redirecting: true };
};

/**
 * Returns a user if the app was reopened after a Google redirect.
 *
 * Safe to call on every mount: it resolves to null when no redirect is pending.
 */
export const consumePendingGoogleSignIn = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (err) {
    console.warn("Google redirect result unavailable:", err);
    return null;
  }
};
