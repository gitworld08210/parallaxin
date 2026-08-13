import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { Clock, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

const rupees = (c: number) => `₹${(c / 100).toLocaleString("en-IN")}`;

interface Row { id: string; amount_cents: number; status: string; method: string; created_at: string; admin_note: string | null; processed_at: string | null; }

const STATUS: Record<string, { label: string; tone: string; icon: any }> = {
  pending: { label: "Pending", tone: "text-amber-400 bg-amber-500/10", icon: Clock },
  approved: { label: "Approved", tone: "text-sky-400 bg-sky-500/10", icon: CheckCircle2 },
  paid: { label: "Paid", tone: "text-emerald-400 bg-emerald-500/15", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "text-rose-400 bg-rose-500/10", icon: XCircle },
};

export function PayoutHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("payouts" as any).select("id, amount_cents, status, method, created_at, admin_note, processed_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading || rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Banknote className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Payout history</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((r) => {
          const s = STATUS[r.status] ?? STATUS.pending;
          const Icon = s.icon;
          return (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{rupees(r.amount_cents)} <span className="text-xs text-muted-foreground font-normal uppercase">· {r.method}</span></p>
                <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                {r.admin_note && r.status === "rejected" && <p className="text-[11px] text-rose-400 mt-1">{r.admin_note}</p>}
              </div>
              <span className={cn("text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full flex items-center gap-1", s.tone)}>
                <Icon className="h-3 w-3" />{s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
