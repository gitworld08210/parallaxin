import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, ShieldCheck } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
};

// Mock OAuth for shim
const oauth = {
  getAuthorizationDetails: (id: string) => Promise.resolve({ data: null as AuthorizationDetails | null, error: null }),
  approveAuthorization: (id: string) => Promise.resolve({ data: { redirect_url: "" }, error: null }),
  denyAuthorization: (id: string) => Promise.resolve({ data: { redirect_url: "" }, error: null }),
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) { setError("Missing authorization_id"); return; }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) { setError(error.message || "Could not load authorization"); return; }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = (data as any)?.redirect_url ?? (data as any)?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center px-6 bg-background">
        <div className="max-w-sm w-full text-center space-y-3">
          <h1 className="font-display text-2xl">Authorization failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  return (
    <main className="min-h-screen grid place-items-center px-6 py-10 bg-background">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <span className="inline-flex h-14 w-14 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </span>
            <span className="text-2xl text-muted-foreground">↔</span>
            <span className="inline-flex h-14 w-14 rounded-2xl bg-secondary/60 border border-border items-center justify-center overflow-hidden">
              {details.client?.logo_uri
                ? <img src={details.client.logo_uri} alt="" className="h-full w-full object-cover" />
                : <ShieldCheck className="h-6 w-6 text-primary" />}
            </span>
          </div>
          <h1 className="font-display text-2xl">Connect {clientName} to Aurelix</h1>
          <p className="text-sm text-muted-foreground">
            {clientName} is asking to act as you on Aurelix. It will use the Aurelix tools with your account's permissions.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What it can do</p>
          <ul className="text-sm space-y-1.5">
            <li>• Read your profile, posts, and notifications</li>
            <li>• Publish posts to your feed</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="py-3 rounded-2xl bg-secondary/60 border border-border text-sm font-semibold disabled:opacity-60"
          >
            Deny
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="py-3 rounded-2xl bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow disabled:opacity-60"
          >
            {busy ? "…" : "Approve"}
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          You can revoke this at any time in Aurelix settings.
        </p>
      </div>
    </main>
  );
}