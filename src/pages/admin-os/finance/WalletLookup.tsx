import { useCallback, useEffect, useState } from "react";
import { Search, Loader2, ShieldAlert, Wallet as WalletIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const nf = new Intl.NumberFormat("en-IN");

type Row = {
  wallet_uuid: string; wallet_id: string; handle: string; username: string | null;
  display_name: string | null; avatar_url: string | null; status: string;
  risk_level: string; trust_score: number; total: number;
};

const tone = (s: string) =>
  s === "active" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
  : s === "frozen" || s === "suspended" ? "bg-destructive/15 text-destructive border-destructive/30"
  : "bg-muted text-muted-foreground border-border";

export default function AdminWalletLookup() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (term: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("wallet_admin_search" as any, { _q: term });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows((data as unknown as Row[]) ?? []);
  }, []);

  useEffect(() => { search(""); }, [search]);

  const open = async (r: Row) => {
    const { data, error } = await supabase.rpc("wallet_admin_profile" as any, { _wallet: r.wallet_uuid });
    if (error) return toast.error(error.message);
    setSelected(data);
  };

  const setStatus = async (status: string) => {
    const id = selected?.wallet?.id;
    if (!id) return;
    const reason = window.prompt(`Reason for marking this wallet ${status}?`) ?? "";
    if (!reason.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("wallet_set_status" as any, { _wallet: id, _status: status, _reason: reason });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Wallet marked ${status}`);
    setSelected(null);
    search(q);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <WalletIcon className="h-4 w-4 text-primary" />
        <h1 className="text-xl font-semibold tracking-tight">Wallet lookup</h1>
      </div>

      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); search(q); }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" aria-label="Search wallets"
            placeholder="Wallet ID, handle, username, email or phone" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Card className="divide-y divide-border overflow-hidden">
            {rows.length === 0 ? (
              <p className="p-6 text-xs text-muted-foreground">No wallets matched this search.</p>
            ) : rows.map((r) => (
              <button key={r.wallet_uuid} onClick={() => open(r)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40">
                <img src={r.avatar_url ?? "/placeholder.svg"} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.display_name ?? r.username ?? "—"} <span className="text-xs text-muted-foreground">@{r.handle}</span></p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{r.wallet_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{nf.format(r.total)}</p>
                  <Badge variant="outline" className={tone(r.status)}>{r.status}</Badge>
                </div>
              </button>
            ))}
          </Card>

          <Card className="h-fit p-4">
            {!selected ? (
              <p className="text-xs text-muted-foreground">Select a wallet to view its full financial profile.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">{selected.profile?.display_name ?? selected.profile?.username}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{selected.wallet.wallet_id}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(selected.balances as Record<string, number>).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border p-2">
                      <p className="capitalize text-muted-foreground">{k}</p>
                      <p className="font-semibold tabular-nums">{nf.format(v)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={tone(selected.wallet.status)}>{selected.wallet.status}</Badge>
                  <Badge variant="outline">Trust {selected.wallet.trust_score}</Badge>
                  <Badge variant="outline">Risk {selected.wallet.risk_level}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("frozen")} className="gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" /> Freeze
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("active")}>Reactivate</Button>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold">Recent ledger</p>
                  <ul className="max-h-64 space-y-1 overflow-y-auto text-[11px]">
                    {(selected.ledger ?? []).map((l: any) => (
                      <li key={l.txn_id + l.created_at} className="flex justify-between gap-2 border-b border-border/50 pb-1">
                        <span className="truncate text-muted-foreground">{l.label ?? l.source}</span>
                        <span className={l.direction === "credit" ? "text-emerald-500" : "text-destructive"}>
                          {l.direction === "credit" ? "+" : "−"}{nf.format(l.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
