import { useMemo, useState } from "react";
import { useWalletLedger, LedgerRow } from "@/hooks/useWalletLedger";
import { Coins, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const rupees = (c: number) => `₹${(Math.abs(c) / 100).toLocaleString("en-IN")}`;

type Filter = "all" | "spent" | "earned" | "payouts";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "spent", label: "Spent" },
  { id: "payouts", label: "Payouts" },
];

function classify(r: LedgerRow): Filter {
  if (r.kind === "payout") return "payouts";
  if (r.kind === "tip_received" || r.kind === "gift_received" || (r.kind === "coin" && r.amount > 0) || (r.kind === "topup" && r.amount > 0)) return "earned";
  return "spent";
}

function groupByDay(rows: LedgerRow[]) {
  const groups: Record<string, LedgerRow[]> = {};
  rows.forEach((r) => {
    const d = new Date(r.created_at);
    const key = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
    groups[key] = groups[key] || [];
    groups[key].push(r);
  });
  return groups;
}

export function TransactionsList() {
  const { rows, loading } = useWalletLedger(50);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => filter === "all" ? rows : rows.filter((r) => classify(r) === filter), [rows, filter]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition",
              filter === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground")}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([day, list]) => (
            <div key={day}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 mb-1">{day}</p>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {list.map((r) => {
                  const positive = r.amount > 0;
                  const isCoin = r.currency === "coins";
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className={cn("h-9 w-9 rounded-full grid place-items-center shrink-0",
                        positive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        {positive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        {r.status && r.status !== "verified" && r.status !== "paid" && r.status !== "approved" && (
                          <p className="text-[10px] text-muted-foreground capitalize">{r.status.replace(/_/g, " ")}</p>
                        )}
                      </div>
                      <div className={cn("text-sm font-bold flex items-center gap-1 shrink-0", positive ? "text-emerald-400" : "text-foreground")}>
                        {positive ? "+" : "−"}
                        {isCoin ? (
                          <><Coins className="h-3.5 w-3.5" />{Math.abs(r.amount).toLocaleString("en-IN")}</>
                        ) : (
                          <>{rupees(r.amount)}</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
