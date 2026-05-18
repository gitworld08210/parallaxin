import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import { VerificationKind } from "@/lib/mock";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const kinds: { id: VerificationKind; title: string; desc: string }[] = [
  { id: "creator", title: "Creator verified", desc: "For active creators with consistent original content" },
  { id: "gov", title: "Government verified", desc: "Official institutions and public sector accounts" },
  { id: "brand", title: "Brand verified", desc: "Registered brands and businesses" },
  { id: "verified", title: "Standard verified", desc: "Notable individuals & authentic identity" },
];

const Verification = () => {
  const nav = useNavigate();
  const [selected, setSelected] = useState<VerificationKind>("creator");
  const [reason, setReason] = useState("");

  return (
    <div>
      <TopBar
        subtitle="Identity"
        title="Verification"
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-5 space-y-3">
        {kinds.map((k) => (
          <button
            key={k.id}
            onClick={() => setSelected(k.id)}
            className="w-full text-left"
          >
            <GlassCard
              className={`flex items-start gap-3 transition-all ${
                selected === k.id ? "border-primary/60 shadow-glow" : ""
              }`}
            >
              <span className="h-10 w-10 rounded-xl glass-strong grid place-items-center">
                <VerificationBadge kind={k.id} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-sm">{k.title}</p>
                <p className="text-xs text-muted-foreground">{k.desc}</p>
              </div>
              <span
                className={`h-5 w-5 rounded-full border-2 ${
                  selected === k.id ? "bg-gradient-primary border-transparent" : "border-border"
                }`}
              />
            </GlassCard>
          </button>
        ))}

        <GlassCard>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Tell admins why you qualify…"
            className="w-full mt-2 bg-transparent outline-none text-sm placeholder:text-muted-foreground resize-none"
          />
        </GlassCard>

        <button
          onClick={() =>
            toast({
              title: "Request submitted",
              description: "Admin review queued. You'll be notified within 48h.",
            })
          }
          className="w-full rounded-2xl py-3.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow"
        >
          Submit for admin review
        </button>

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          Fraud detection · trust scoring · anti-farming checks run automatically
        </p>
      </div>
    </div>
  );
};

export default Verification;
