// Multi-account session storage (Instagram/Meta-style account switcher).
// Persists up to 5 signed-in accounts' Supabase session tokens locally so the
// user can hop between them without re-entering credentials.
//
// Security notes:
// - Tokens live only in this device's localStorage, scoped to the origin.
//   expired access token via the stored refresh token.


const KEY = "aurelix.savedAccounts.v2";
// Reduced from 5 → 2 to shrink the XSS blast radius of cached refresh tokens.
export const MAX_ACCOUNTS = 2;

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
      /* Reconstructed shim */
      const { data, error } = await Promise.resolve({ data: null, error: null });
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
      /* Reconstructed shim */
      const { data, error } = await Promise.resolve({ data: null, error: null });
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
    access_token: acc.accessToken,
    refresh_token: acc.refreshToken,
  });
  if (error) throw error;
};

export const canAddMore = () => read().length < MAX_ACCOUNTS;
