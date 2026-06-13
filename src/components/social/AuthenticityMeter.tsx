import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

type Breakdown = {
  originality?: number | null;
  ai_generated_likelihood?: number | null;
  caption_match?: number | null;
  safety?: number | null;
  summary?: string;
  flags?: string[];
};

export const AuthenticityMeter = ({
  score,
  breakdown,
}: {
  score: number | null | undefined;
  breakdown?: Breakdown | null;
}) => {
  if (score == null) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wide">Authenticity</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Not scored yet.</p>
      </div>
    );
  }
  const tier =
    score >= 75 ? { label: "High", color: "text-emerald-400", bar: "bg-emerald-400", Icon: ShieldCheck }
    : score >= 50 ? { label: "Moderate", color: "text-amber-400", bar: "bg-amber-400", Icon: Shield }
    : { label: "Low", color: "text-red-400", bar: "bg-red-400", Icon: ShieldAlert };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <tier.Icon className={`h-4 w-4 ${tier.color}`} />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Authenticity</p>
        </div>
        <span className={`text-sm font-bold ${tier.color}`}>{score}/100 · {tier.label}</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tier.bar}`} style={{ width: `${score}%` }} />
      </div>
      {breakdown?.summary && <p className="text-xs text-muted-foreground mt-3">{breakdown.summary}</p>}
      {breakdown && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          {breakdown.originality != null && <Row label="Originality" v={breakdown.originality} />}
          {breakdown.ai_generated_likelihood != null && <Row label="AI-generated" v={breakdown.ai_generated_likelihood} invert />}
          {breakdown.caption_match != null && <Row label="Caption match" v={breakdown.caption_match} />}
          {breakdown.safety != null && <Row label="Safety" v={breakdown.safety} />}
        </div>
      )}
      {breakdown?.flags && breakdown.flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {breakdown.flags.map((f) => (
            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, v, invert }: { label: string; v: number; invert?: boolean }) => (
  <div className="flex items-center justify-between">
    <span>{label}</span>
    <span className={invert ? (v >= 60 ? "text-red-400" : "text-foreground") : "text-foreground"}>{v}</span>
  </div>
);
