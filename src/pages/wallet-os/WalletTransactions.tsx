import { useMemo, useState } from "react";
import { Download, Loader2, Receipt, Search } from "lucide-react";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { WalletEmpty } from "@/components/wallet-os/WalletEmpty";
import { useWalletLedgerOS, WalletTxn } from "@/hooks/useWalletOS";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const nf = new Intl.NumberFormat("en-IN");

const FILTERS = [
  { id: "all", label: "All" },
  { id: "purchase", label: "Purchase" },
  { id: "gift", label: "Gift" },
  { id: "reward", label: "Reward" },
  { id: "withdrawal", label: "Withdrawal" },
  { id: "marketplace", label: "Marketplace" },
  { id: "subscription", label: "Subscription" },
  { id: "refund", label: "Refund" },
];

function csv(rows: WalletTxn[]) {
  const head = "txn_id,date,type,direction,bucket,amount,fee,balance_after,status";
  const body = rows.map((r) => [r.txn_id, r.created_at, r.source, r.direction, r.bucket, r.amount, r.fee, r.balance_after, r.status].join(","));
  return [head, ...body].join("\n");
}

export default function WalletTransactions() {
  const { rows, loading } = useWalletLedgerOS(200);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter !== "all" && r.source !== filter) return false;
    if (q && !(`${r.txn_id} ${r.label ?? ""} ${r.source}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (from && r.created_at < from) return false;
    if (to && r.created_at > `${to}T23:59:59`) return false;
    return true;
  }), [rows, filter, q, from, to]);

  const exportCsv = () => {
    const blob = new Blob([csv(filtered)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aurelix-wallet-transactions.csv";
    a.click();
    toast.success("Export ready");
  };

  return (
    <WalletShell title="Transactions" subtitle="Every Aura movement" back>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transaction ID or label" aria-label="Search transactions" className="h-9 pl-8 text-sm" />
          </div>
          <button onClick={exportCsv} aria-label="Export transactions as CSV" className="wallet-os-action grid h-9 w-9 place-items-center">
            <Download className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className="h-9 text-xs" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" className="h-9 text-xs" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                filter === f.id ? "border-[hsl(var(--wallet-accent))] bg-[hsl(var(--wallet-accent)/0.15)]" : "border-border/60 text-muted-foreground")}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <WalletEmpty icon={Receipt} title="No transactions" hint="Nothing matches this filter yet." />
        ) : (
          <ol className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="wallet-os-tile p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold capitalize">{r.label ?? r.source.replace(/_/g, " ")}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{r.txn_id}</p>
                  </div>
                  <p className={cn("text-sm font-bold tabular-nums", r.direction === "credit" ? "text-emerald-400" : "text-foreground")}>
                    {r.direction === "credit" ? "+" : "−"}{nf.format(r.amount)}
                  </p>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <Item k="Fee" v={nf.format(r.fee)} />
                  <Item k="Balance after" v={nf.format(r.balance_after)} />
                  <Item k="Bucket" v={r.bucket} />
                  <Item k="Status" v={r.status} />
                  <Item k="Date" v={new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                  <Item k="Time" v={new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} />
                </dl>
              </li>
            ))}
          </ol>
        )}
      </div>
    </WalletShell>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{k}</dt><dd className="capitalize text-foreground/80">{v}</dd>
    </div>
  );
}
