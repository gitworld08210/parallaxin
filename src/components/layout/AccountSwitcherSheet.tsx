// AccountSwitcherSheet — Instagram-style multi-account switcher.
// Lists locally-saved accounts (max 5), lets the user switch between them
// with one tap, remove them, or sign a new account in.
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, LogIn, Plus, X, Eye, EyeOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthProvider";
import {
  MAX_ACCOUNTS,
  SavedAccount,
  loadSavedAccounts,
  removeSavedAccount,
  switchToAccount,
  upsertSavedAccount,
} from "@/lib/multiAccount";
import { toast } from "sonner";
import { AuraAvatar } from "@/components/vibe/AuraAvatar";
import { gradientFor, initialsOf } from "@/lib/format";

export const AccountSwitcherSheet = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const { user, profile, session } = useAuth();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Keep the current signed-in account persisted so it shows up in the
  // switcher after future sessions restore.
  useEffect(() => {
    if (!user) return;
    upsertSavedAccount({
      userId: user.id,
      email: user.email ?? null,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      accessToken: "managed-by-firebase",
      refreshToken: "managed-by-firebase",
      updatedAt: Date.now(),
    });
    setAccounts(loadSavedAccounts());
  }, [user?.id, profile?.username, profile?.display_name, profile?.avatar_url]);

  useEffect(() => {
    const refresh = () => setAccounts(loadSavedAccounts());
    refresh();
    window.addEventListener("aurelix:accounts-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("aurelix:accounts-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [open]);

  const ordered = useMemo(() => {
    const list = [...accounts];
    list.sort((a, b) => (a.userId === user?.id ? -1 : b.userId === user?.id ? 1 : b.updatedAt - a.updatedAt));
    return list;
  }, [accounts, user?.id]);

  const canAdd = accounts.length < MAX_ACCOUNTS;

  const handleSwitch = async (acc: SavedAccount) => {
    if (acc.userId === user?.id) {
      onOpenChange(false);
      return;
    }
    // With Firebase, we show the login form for account switching
    setEmail(acc.email || "");
    setShowLogin(true);
  };

  const handleRemove = (acc: SavedAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSavedAccount(acc.userId);
    toast.success("Account removed from this device");
  };

  const handleLogin = async () => {
    if (!canAdd) {
      toast.error(`Maximum ${MAX_ACCOUNTS} accounts. Remove one first.`);
      return;
    }
    setBusy("login");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pw);
      const firebaseUser = userCredential.user;
      
      if (firebaseUser) {
        const profileSnap = await getDoc(doc(db, "profiles", firebaseUser.uid));
        const prof = profileSnap.exists() ? profileSnap.data() : null;

        upsertSavedAccount({
          userId: firebaseUser.uid,
          email: firebaseUser.email ?? email,
          username: prof?.username ?? null,
          displayName: prof?.display_name ?? null,
          avatarUrl: prof?.avatar_url ?? null,
          accessToken: "firebase-token",
          refreshToken: "firebase-token",
          updatedAt: Date.now(),
        });
        toast.success("Account added ✦");
        setEmail("");
        setPw("");
        setShowLogin(false);
        onOpenChange(false);
      }
    } catch (e) {
      toast.error((e as Error).message || "Sign in failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-t border-border p-0 rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-5 pt-3 pb-2 text-left">
          <SheetTitle className="text-lg font-bold">Switch accounts</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {accounts.length}/{MAX_ACCOUNTS} accounts saved on this device
          </p>
        </SheetHeader>

        <div className="px-3 pb-2">
          {ordered.map((a) => {
            const active = a.userId === user?.id;
            const name = a.displayName || a.username || a.email || "Account";
            return (
              <button
                key={a.userId}
                onClick={() => handleSwitch(a)}
                disabled={busy !== null}
                className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-secondary/60 transition-colors text-left disabled:opacity-60"
              >
                {a.avatarUrl ? (
                  <img src={a.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <AuraAvatar gradient={gradientFor(a.username ?? a.email ?? undefined)} size="md" initials={initialsOf(name)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {a.username ? `@${a.username}` : name}
                  </p>
                  {a.email && (
                    <p className="text-[11px] text-muted-foreground truncate">{a.email}</p>
                  )}
                </div>
                {busy === a.userId ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : active ? (
                  <span className="h-6 w-6 rounded-full bg-primary grid place-items-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                  </span>
                ) : (
                  <span
                    role="button"
                    aria-label="Remove"
                    onClick={(e) => handleRemove(a, e as any)}
                    className="h-8 w-8 rounded-full grid place-items-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add account */}
        <div className="px-3 pb-6">
          {!showLogin ? (
            <button
              onClick={() => (canAdd ? setShowLogin(true) : toast.error(`Maximum ${MAX_ACCOUNTS} accounts`))}
              className="w-full flex items-center gap-3 rounded-2xl px-3 py-3 border border-dashed border-border hover:bg-secondary/40 transition-colors text-left"
            >
              <span className="h-11 w-11 rounded-full border-2 border-dashed border-border grid place-items-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">Add account</p>
                <p className="text-[11px] text-muted-foreground">
                  Sign in with another email · up to {MAX_ACCOUNTS} total
                </p>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">Sign in to another account</p>
                <button
                  onClick={() => setShowLogin(false)}
                  className="h-7 w-7 rounded-full grid place-items-center hover:bg-secondary/60"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary/60"
              />
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full h-11 pl-3 pr-10 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full hover:bg-secondary/60"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={handleLogin}
                disabled={busy === "login"}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition"
              >
                {busy === "login" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> Sign in & switch
                  </>
                )}
              </button>
              <p className="text-[11px] text-muted-foreground text-center">
                Your current account stays saved — switch back any time.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};