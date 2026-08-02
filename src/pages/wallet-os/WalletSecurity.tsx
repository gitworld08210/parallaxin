import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Fingerprint, Bell, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { useWalletOS } from "@/hooks/useWalletOS";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Toggle = { key: string; label: string; hint: string; icon: any };

const TOGGLES: Toggle[] = [
  { key: "shield_enabled", label: "Wallet Shield", hint: "Extra verification on every outgoing transaction", icon: ShieldCheck },
  { key: "biometric_enabled", label: "Biometric lock", hint: "Require device biometrics to open the wallet", icon: Fingerprint },
  { key: "pin_enabled", label: "Transaction PIN", hint: "Ask for a PIN before sending or withdrawing", icon: Lock },
  { key: "alerts_enabled", label: "Security alerts", hint: "Notify me about unusual wallet activity", icon: Bell },
];

export default function WalletSecurity() {
  const { wallet, loading, refresh } = useWalletOS();
  const [saving, setSaving] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!wallet) return;
    supabase.from("wallet_risk_alerts").select("id, level, kind, summary, created_at, resolved")
      .eq("wallet_id", wallet.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setAlerts(data ?? []));
  }, [wallet?.id]);

  const toggle = async (key: string, value: boolean) => {
    if (!wallet) return;
    setSaving(key);
    const { error } = await supabase.from("wallets").update({ [key]: value } as any).eq("id", wallet.id);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Security setting updated");
    refresh();
  };

  return (
    <WalletShell title="Security Center" subtitle="Protect your financial identity" back>
      {loading || !wallet ? (
        <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          <div className="wallet-os-tile flex items-center gap-4 p-4">
            <div className="relative grid h-16 w-16 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--wallet-accent))" strokeWidth="3"
                  strokeDasharray={`${(wallet.security_score / 100) * 94} 94`} strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold tabular-nums">{wallet.security_score}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Security score</p>
              <p className="text-xs text-muted-foreground">
                {wallet.security_score >= 80 ? "Excellent protection" : wallet.security_score >= 50 ? "Good — enable more layers" : "Weak — turn on Wallet Shield"}
              </p>
            </div>
          </div>

          <ul className="wallet-os-tile divide-y divide-border/40 overflow-hidden">
            {TOGGLES.map((t) => {
              const Icon = t.icon;
              const on = Boolean((wallet as any)[t.key]);
              return (
                <li key={t.key} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl", on ? "bg-[hsl(var(--wallet-accent)/0.15)] text-[hsl(var(--wallet-accent))]" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground">{t.hint}</p>
                  </div>
                  <Switch checked={on} disabled={saving === t.key} onCheckedChange={(v) => toggle(t.key, v)} aria-label={t.label} />
                </li>
              );
            })}
          </ul>

          <div className="wallet-os-tile p-4">
            <p className="mb-2 text-sm font-semibold">Recent security activity</p>
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No suspicious activity detected on your wallet.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 rounded-xl border border-border/50 p-2.5">
                    <AlertTriangle className={cn("mt-0.5 h-4 w-4", a.level === "critical" ? "text-rose-400" : a.level === "warning" ? "text-amber-400" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{a.summary}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN")}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </WalletShell>
  );
}
