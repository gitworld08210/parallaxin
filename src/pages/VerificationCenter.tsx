import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, BadgeCheck, ShieldCheck, CircleDot, Sparkles, Clock, XCircle, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/vibe/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

type VR = { id: string; status: string; category: string; created_at: string };

const CATEGORY_LABELS: Record<string, string> = {
  government: "Government / Official",
  founder: "Founder",
  public_figure: "Public Figure",
  business: "Business / Brand",
  media: "Media / Journalist",
};

const VerificationCenter = () => {
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const [vr, setVr] = useState<VR | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("id, status, category, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setVr((data as VR) ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const isVerified = !!profile?.verified;
  const status: "verified" | "pending" | "rejected" | "none" = isVerified
    ? "verified"
    : vr?.status === "pending"
    ? "pending"
    : vr?.status === "rejected"
    ? "rejected"
    : "none";

  const statusLabel =
    status === "verified" ? "Verified" :
    status === "pending" ? "Under review" :
    status === "rejected" ? "Not approved" :
    "Not Verified";

  const StatusIcon =
    status === "verified" ? BadgeCheck :
    status === "pending" ? Clock :
    status === "rejected" ? XCircle :
    CircleDot;

  const ctaDisabled = status === "pending" || status === "verified";
  const ctaLabel =
    status === "pending" ? "Under review" :
    status === "verified" ? "Already verified" :
    "Request Verification";

  return (
    <div>
      <header className="h-14 px-2 flex items-center justify-between border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
        <button onClick={() => nav(-1)} className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted/40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">Verification Center</h1>
        <button className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted/40">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      <div className="px-5 pt-6 pb-10 space-y-5">
        {/* Hero */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow shrink-0">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl leading-tight">
                Get Verified <br /> on Aurelix <BadgeCheck className="inline h-5 w-5 text-verified -mt-1" />
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Show your authenticity. Build trust. Stand out.
              </p>
            </div>
          </div>
          <button
            onClick={() => nav("/verification/request")}
            disabled={ctaDisabled}
            className="mt-5 w-full rounded-2xl py-3.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {ctaLabel}
          </button>
        </GlassCard>

        {/* Your Verification */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">
            Your Verification
          </p>
          <GlassCard className="p-0 overflow-hidden divide-y divide-border">
            <Row icon={StatusIcon} label="Status" value={statusLabel} tone={status === "verified" ? "good" : status === "rejected" ? "bad" : "muted"} />
            <Row icon={BadgeCheck} label="Eligibility" value="You are eligible to apply" tone="good" />
            <Row icon={Sparkles} label="Benefits" value="Stand out, get discovered" tone="muted" />
            {vr && (
              <Row
                icon={CircleDot}
                label="Category"
                value={CATEGORY_LABELS[vr.category] ?? vr.category}
                tone="muted"
              />
            )}
          </GlassCard>
        </div>

        {/* Learn more */}
        <button className="w-full flex items-center justify-between px-4 py-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors">
          <span className="text-sm font-medium">Learn more about verification</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {loading && (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        )}
      </div>
    </div>
  );
};

const Row = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "good" | "bad" | "muted";
}) => {
  const valueColor =
    tone === "good" ? "text-verified" : tone === "bad" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Icon className={`h-4 w-4 ${valueColor}`} strokeWidth={2} />
      <span className="text-sm font-medium flex-1">{label}</span>
      <span className={`text-xs font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
};

export default VerificationCenter;
