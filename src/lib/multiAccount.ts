import { auth } from "@/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";

const KEY = "aurelix.savedAccounts.v2";
export const MAX_ACCOUNTS = 5;

export type SavedAccount = {
  userId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string;
  updatedAt: number;
};

const read = (): SavedAccount[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (list: SavedAccount[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ACCOUNTS)));
    window.dispatchEvent(new Event("aurelix:accounts-changed"));
  } catch {
    /* quota — ignore */
  }
};

export const loadSavedAccounts = (): SavedAccount[] => read();

export const upsertSavedAccount = (acc: SavedAccount) => {
  const list = read().filter((a) => a.userId !== acc.userId);
  list.unshift(acc);
  write(list);
};

export const removeSavedAccount = (userId: string) => {
  write(read().filter((a) => a.userId !== userId));
};

export const switchToAccount = async (acc: SavedAccount) => {
  // Since we're using Firebase Auth now, switching accounts requires a re-login
  // or using Firebase's multi-auth if supported. 
  // For now, we'll suggest using the Email/PW login in the switcher.
  throw new Error("Please re-enter credentials to switch accounts.");
};

export const canAddMore = () => read().length < MAX_ACCOUNTS;