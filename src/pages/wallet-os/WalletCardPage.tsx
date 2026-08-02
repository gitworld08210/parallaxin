import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw, ShieldCheck, Check, Palette, History, Lock } from "lucide-react";
import { toast } from "sonner";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { WalletCard } from "@/components/wallet-os/WalletCard";
import { useWalletOS } from "@/hooks/useWalletOS";
import { useWalletCard, type CardTheme } from "@/hooks/useWalletCard";
import { CARD_THEMES, CARD_TYPE_LABEL, REFRESH_REASONS, fmtDate } from "@/components/wallet-os/cardThemes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GRADE_TONE: Record<string, string> = {
  Excellent: "text-emerald-400",
  Good: "text-sky-400",
  Average: "text-amber-400",
  Weak: "text-rose-400",
};

export default function WalletCardPage() {
  const { wallet } = useWalletOS();
  const { state, loading, refreshCard, setTheme, runReview } = useWalletCard();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState("security_upgrade");

  if (loading || !wallet || !state) {
    return (
      <WalletShell title="Digital Card" back>
        <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </WalletShell>
    );
  }

  const { card, themes, history, review } = state;

  const doRefresh = async () => {
    setBusy("refresh");
    const { error } = await refreshCard(reason);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Card regenerated — Wallet ID, balance and history unchanged");
  };

  const doReview = async () => {
    setBusy("review");
    const { data, error } = await runReview(true);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Security review complete — ${(data as any)?.grade}`);
  };

  return (
    <WalletShell title="Digital Card" subtitle={`${CARD_TYPE_LABEL[card.card_type]} · V${card.version}`} back>
      <div className="space-y-5">
        <WalletCard wallet={wallet} card={state} />

        <section className="wallet-os-tile p-4">
          <h2 className="mb-3 text-sm font-semibold">Card lifecycle</h2>
          <dl className="space-y-1.5 text-xs">
            <Line k="Card version" v={`V${card.version}`} accent />
            <Line k="Issued" v={fmtDate(card.issued_at)} />
            <Line k="Refresh recommended" v={fmtDate(card.refresh_due_at)} />
            <Line k="Encryption" v={card.encryption} />
            <Line k="Security status" v={card.security_status.replace(/_/g, " ")} accent />
            <Line k="Wallet status" v={wallet.status} accent />
            <Line k="Wallet ID" v={`${wallet.wallet_id} · never changes`} />
          </dl>
        </section>

        <section className="wallet-os-tile p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Palette className="h-3.5 w-3.5" /> Card editions</h2>
          <p className="mb-3 mt-0.5 text-[11px] text-muted-foreground">Switching editions never affects your security or balance.</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CARD_THEMES) as CardTheme[]).map((t) => {
              const unlocked = themes.includes(t);
              const skin = CARD_THEMES[t];
              const active = card.theme === t;
              return (
                <button key={t} disabled={!unlocked || busy === "theme"}
                  onClick={async () => { setBusy("theme"); const { error } = await setTheme(t); setBusy(null); error ? toast.error(error.message) : toast.success(`${skin.label} applied`); }}
                  className={cn("relative overflow-hidden rounded-2xl border p-3 text-left transition",
                    active ? "border-[hsl(var(--wallet-accent))]" : "border-border/60",
                    !unlocked && "opacity-45")}
                  style={{ backgroundImage: `${skin.glow}, ${skin.surface}` }}>
                  <p className="text-[11px] font-semibold text-white">{skin.label}</p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: skin.accent }}>{skin.finish} finish</p>
                  {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5" style={{ color: skin.accent }} />}
                  {!unlocked && <Lock className="absolute right-2 top-2 h-3 w-3 text-white/60" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="wallet-os-tile p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><RefreshCw className="h-3.5 w-3.5" /> Refresh card</h2>
          <p className="mb-3 mt-0.5 text-[11px] text-muted-foreground">
            Cards never expire — they are refreshed. Wallet ID, handle, balance, history, rewards and trust score all stay exactly the same.
          </p>
          <div className="space-y-1.5">
            {REFRESH_REASONS.map((r) => (
              <button key={r.id} onClick={() => setReason(r.id)}
                className={cn("flex w-full items-start gap-2 rounded-xl border p-2.5 text-left",
                  reason === r.id ? "border-[hsl(var(--wallet-accent))] bg-[hsl(var(--wallet-accent)/0.08)]" : "border-border/60")}>
                <span className={cn("mt-1 h-2 w-2 rounded-full", reason === r.id ? "bg-[hsl(var(--wallet-accent))]" : "bg-muted")} />
                <span>
                  <span className="block text-xs font-medium">{r.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{r.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <Button className="mt-3 h-11 w-full gap-2" onClick={doRefresh} disabled={busy === "refresh"}>
            {busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh to V{card.version + 1}
          </Button>
        </section>

        <section className="wallet-os-tile p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Wallet security review</h2>
          {review ? (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-semibold tabular-nums">{review.score}</p>
                <p className={cn("text-sm font-semibold", GRADE_TONE[review.grade])}>{review.grade}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Last reviewed {fmtDate(review.reviewed_at)} · next review {fmtDate(review.next_due_at)}
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
                {["password", "passkey", "biometric", "recovery", "email", "phone", "shield", "alerts"].map((k) => (
                  <li key={k} className="flex items-center gap-1.5 capitalize">
                    <span className={cn("h-1.5 w-1.5 rounded-full", review.checks[k] ? "bg-emerald-400" : "bg-muted-foreground/40")} />
                    <span className={review.checks[k] ? "" : "text-muted-foreground"}>{k}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Trusted devices: {String(review.checks.trusted_devices ?? 0)} · reviews never block your wallet, they only recommend improvements.
              </p>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">Run your first review to see how protected your wallet is.</p>
          )}
          <Button variant="outline" className="mt-3 h-10 w-full gap-2" onClick={doReview} disabled={busy === "review"}>
            {busy === "review" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Run security review
          </Button>
        </section>

        <section className="wallet-os-tile p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><History className="h-3.5 w-3.5" /> Card history</h2>
          <ol className="mt-3 space-y-0">
            {history.map((h, i) => (
              <motion.li key={h.version} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="relative flex gap-3 pb-4 last:pb-0">
                <span className="relative flex flex-col items-center">
                  <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", h.is_current ? "bg-[hsl(var(--wallet-accent))]" : "bg-muted-foreground/40")} />
                  {i < history.length - 1 && <span className="w-px flex-1 bg-border" />}
                </span>
                <div className="pb-1">
                  <p className="text-xs font-medium">Version {h.version}{h.is_current && " · current"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {CARD_THEMES[h.theme].label} · issued {fmtDate(h.issued_at)}
                    {h.retired_at ? ` · retired ${fmtDate(h.retired_at)}` : ""}
                  </p>
                  {h.refresh_reason && <p className="text-[10px] capitalize text-muted-foreground">Reason: {h.refresh_reason.replace(/_/g, " ")}</p>}
                </div>
              </motion.li>
            ))}
          </ol>
          <p className="mt-1 text-[10px] text-muted-foreground">Every refresh is logged permanently and can never be edited manually.</p>
        </section>
      </div>
    </WalletShell>
  );
}

function Line({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("truncate font-medium capitalize", accent && "text-[hsl(var(--wallet-accent))]")}>{v}</dd>
    </div>
  );
}
