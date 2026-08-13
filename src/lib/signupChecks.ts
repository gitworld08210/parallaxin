import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, increment, serverTimestamp } from "firebase/firestore";

export const MAX_ACCOUNTS_PER_EMAIL = 3;

export const RESERVED_USERNAMES = [
  "admin", "root", "support", "help", "aurelix", "parallax", "official",
  "founder", "staff", "moderator", "system", "api", "about", "settings",
  "login", "signup", "auth", "profile", "home", "explore", "messages",
];

export const normalizeUsername = (raw: string) =>
  raw.toLowerCase().trim().replace(/[^a-z0-9._]/g, "").slice(0, 20);

export const usernameFormatError = (u: string): string | null => {
  if (u.length < 3) return "At least 3 characters";
  if (u.length > 20) return "Maximum 20 characters";
  if (!/^[a-z0-9._]+$/.test(u)) return "Only letters, numbers, . and _";
  if (/^[._]|[._]$/.test(u)) return "Cannot start or end with . or _";
  if (RESERVED_USERNAMES.includes(u)) return "This username is reserved";
  return null;
};

/** Returns true if the username is free to take. */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, "usernames", username));
  return !snap.exists();
};

/** How many accounts are already linked to this email. */
export const emailAccountCount = async (email: string): Promise<number> => {
  const key = email.toLowerCase().trim();
  const snap = await getDoc(doc(db, "email_accounts", key));
  if (!snap.exists()) return 0;
  return Number(snap.data()?.count ?? 0);
};

export const registerEmailAccount = async (email: string, uid: string) => {
  const key = email.toLowerCase().trim();
  await setDoc(
    doc(db, "email_accounts", key),
    { email: key, count: increment(1), last_uid: uid, updated_at: serverTimestamp() },
    { merge: true },
  );
};
