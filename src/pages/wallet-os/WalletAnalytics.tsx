import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2, BarChart3 } from "lucide-react";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { WalletEmpty } from "@/components/wallet-os/WalletEmpty";
import { useWalletAnalytics, useWalletLedgerOS } from "@/hooks/useWalletOS";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: 7, label: "Daily" },
  { id: 30, label: "Weekly" },
  { id: 90, label: "Monthly" },
  { id: 365, label: "Yearly" },
  { id: 1825, label: "Lifetime" },
];

const SOURCE_COLORS: Record<string, string> = {
  gift: "#8b5cf6", ads: "#22d3ee", marketplace: "#f59e0b", subscription: "#34d399",
  purchase: "#60a5fa", reward: "#f472b6", tip: "#a3e635", withdrawal: "#fb7185",
};

const nf = new Intl.NumberFormat("en-IN");

export default function WalletAnalytics() {
  const [days, setDays] = useState(30);
  const { rows, loading } = useWalletAnalytics(days);
  const { rows: ledger } = useWalletLedgerOS(500);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    income: a.income + Number(r.income), expense: a.expense + Number(r.expense),
  }), { income: 0, expense: 0 }), [rows]);

  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    ledger.filter((l) => l.direction === "credit").forEach((l) => { map[l.source] = (map[l.source] ?? 0) + l.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [ledger]);

  const hasData = rows.some((r) => Number(r.income) || Number(r.expense));

  return (
    <WalletShell title="Analytics" subtitle="Income, expense & sources" back>
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setDays(r.id)}
              className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
                days === r.id ? "border-[hsl(var(--wallet-accent))] bg-[hsl(var(--wallet-accent)/0.15)] text-foreground" : "border-border/60 text-muted-foreground")}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Income" value={totals.income} tone="text-emerald-400" />
          <Stat label="Expense" value={totals.expense} tone="text-rose-400" />
          <Stat label="Net" value={totals.income - totals.expense} tone="text-[hsl(var(--wallet-accent))]" />
        </div>

        <div className="wallet-os-tile p-3">
          {loading ? (
            <div className="grid h-52 place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !hasData ? (
            <WalletEmpty icon={BarChart3} title="No analytics yet" hint="Start earning or spending Aura to unlock your financial trends." />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={rows} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" hide />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0b0b0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#inc)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="#fb7185" fill="url(#exp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {breakdown.length > 0 && (
          <div className="wallet-os-tile p-3">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Income breakdown</p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width="45%" height={140}>
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={34} outerRadius={58} paddingAngle={2}>
                    {breakdown.map((b) => <Cell key={b.name} fill={SOURCE_COLORS[b.name] ?? "#64748b"} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex-1 space-y-1.5">
                {breakdown.slice(0, 6).map((b) => (
                  <li key={b.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ background: SOURCE_COLORS[b.name] ?? "#64748b" }} />
                    <span className="flex-1 capitalize text-muted-foreground">{b.name}</span>
                    <span className="tabular-nums">{nf.format(b.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </WalletShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="wallet-os-tile p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-base font-semibold tabular-nums", tone)}>{nf.format(value)}</p>
    </div>
  );
}
