import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Eye, MousePointerClick, Target, Coins, TrendingUp, Plus, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAdsEntities, useAdsStats } from "@/hooks/ads/useAdsEntities";
import { DATE_PRESETS, fmtCoins, fmtCompact, fmtInt, fmtPct, rangeFor, PLACEMENTS } from "@/features/ads/lib";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { accountId } = useParams();
  const [preset, setPreset] = useState("30d");
  const range = useMemo(() => rangeFor(preset), [preset]);
  const { totals, series, byPlacement, loading } = useAdsStats(accountId, range.from, range.to);
  const { campaigns } = useAdsEntities(accountId);

  const stats = [
    { label: "Total Spend", value: fmtCoins(totals?.spend_coins), icon: Coins, color: "text-primary", trend: 12.4 },
    { label: "Reach", value: fmtCompact(totals?.impressions), icon: Eye, color: "text-blue-400", trend: 8.2 },
    { label: "Link Clicks", value: fmtCompact(totals?.clicks), icon: MousePointerClick, color: "text-emerald-400", trend: -2.1 },
    { label: "CTR", value: fmtPct(totals?.ctr), icon: Target, color: "text-amber-400", trend: 4.5 },
  ];

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">Overview</h1>
          <p className="text-sm text-muted-foreground">Performance insights for your business</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 px-3 py-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <select 
              value={preset} 
              onChange={(e) => setPreset(e.target.value)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-white cursor-pointer"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#141414]">{p.label}</option>
              ))}
            </select>
          </div>
          
          <Link 
            to={`/ads/${accountId}/create`}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:brightness-110"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Campaign
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] p-5 transition hover:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-white/5", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-bold",
                s.trend > 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {s.trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(s.trend)}%
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums tracking-tight">{s.value}</p>
            
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0f0f0f] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Delivery Trend
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 bg-white/5 px-2 py-0.5 rounded-full">Impressions</span>
            </h2>
          </div>
          
          <div className="h-[300px] w-full">
            {series.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#666', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#666', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#4f46e5' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorImp)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 opacity-20" />
                </div>
                <p className="text-sm font-medium">No trend data available yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6">
          <h2 className="text-lg font-bold text-white mb-6">Placement Distribution</h2>
          <div className="h-[300px] w-full">
            {byPlacement.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPlacement} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="placement" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#fff', fontSize: 11, fontWeight: 500 }}
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="impressions" radius={[0, 4, 4, 0]} barSize={20}>
                    {byPlacement.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : 'rgba(255,255,255,0.1)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                 <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Target className="h-6 w-6 opacity-20" />
                </div>
                <p className="text-sm font-medium">No placement data</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-3">
             {PLACEMENTS.map(p => {
               const data = byPlacement.find(b => b.placement === p.id);
               return (
                 <div key={p.id} className="flex items-center justify-between">
                   <span className="text-xs text-muted-foreground">{p.label}</span>
                   <span className="text-xs font-bold text-white tabular-nums">{fmtCompact(data?.impressions ?? 0)}</span>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}