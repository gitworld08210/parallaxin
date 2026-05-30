import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROLES = [
  { id: "architect", label: "Architect", desc: "Shape what Aurelix becomes." },
  { id: "curator", label: "Curator", desc: "Preserve and elevate culture." },
  { id: "sentinel", label: "Sentinel", desc: "Safeguard the civilization." },
  { id: "innovator", label: "Innovator", desc: "Invent its next frontiers." },
] as const;

const FounderApply = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chronicle, setChronicle] = useState("");
  const [why, setWhy] = useState("");
  const [role, setRole] = useState<string>("architect");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase.from("founder_applications") as any).select("status").eq("user_id", user.id).maybeSingle();
      setExisting(data ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    if (chronicle.trim().length < 40) return toast.error("Chronicle needs at least 40 characters");
    if (why.trim().length < 20) return toast.error("Tell us more about why");
    setBusy(true);
    const { error } = await (supabase.from("founder_applications") as any).insert({
      user_id: user.id, chronicle: chronicle.trim(), why: why.trim(), desired_role: role,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Submitted to the Council"); setExisting({ status: "pending" }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 h-14 px-3 flex items-center gap-2 bg-background/90 backdrop-blur border-b border-border">
        <button onClick={() => nav(-1)} className="p-1.5"><ChevronLeft className="h-5 w-5" /></button>
        <Crown className="h-5 w-5 text-aura" />
        <h1 className="text-lg font-semibold">Apply to the Founder Hall</h1>
      </header>

      <div className="px-5 py-6 space-y-4 max-w-xl mx-auto">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
         existing ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="font-display text-xl">
              {existing.status === "pending" && "Your scroll is with the Council"}
              {existing.status === "approved" && "You have been inducted"}
              {existing.status === "rejected" && "Not this season"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {existing.status === "pending" && "We review applications in seasonal cohorts."}
              {existing.status === "rejected" && "You may reapply in 90 days."}
            </p>
            <Link to="/hall-of-founders" className="inline-block mt-4 text-sm text-primary underline">Visit the Hall</Link>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Choose a wing</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button key={r.id} onClick={() => setRole(r.id)}
                    className={`text-left rounded-xl border p-3 transition ${role === r.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <p className="font-semibold text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your chronicle</p>
              <textarea value={chronicle} onChange={(e) => setChronicle(e.target.value)} rows={5}
                placeholder="Where you've been, what you've built, what shaped you."
                className="w-full bg-card border border-border rounded-xl p-3 text-sm leading-snug outline-none focus:border-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Why the Hall</p>
              <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={4}
                placeholder="What you'll contribute. What you'll defend."
                className="w-full bg-card border border-border rounded-xl p-3 text-sm leading-snug outline-none focus:border-primary" />
            </div>
            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? "Submitting…" : "Submit to the Council"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Reviewed by Admin · no auto-induction</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FounderApply;
