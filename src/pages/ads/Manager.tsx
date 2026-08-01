import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAdsEntities, useAdsStats } from "@/hooks/ads/useAdsEntities";
import { DATE_PRESETS, fmtCoins, fmtInt, rangeFor, statusTone } from "./lib";

type Level = "campaign" | "adset" | "ad";

export default function Manager() {
  const { accountId } = useParams();
  const [level, setLevel] = useState<Level>("campaign");
  const [q, setQ] = useState("");
  const [preset, setPreset] = useState("30d");
  const [parent, setParent] = useState<string | null>(null);
  const range = useMemo(() => rangeFor(preset), [preset]);

  const { campaigns, adsets, ads, loading, setStatus } = useAdsEntities(accountId);
  const { totals } = useAdsStats(accountId, range.from, range.to);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (level === "campaign") return campaigns.filter((c) => c.name.toLowerCase().includes(term));
    if (level === "adset")
      return adsets.filter((s) => (!parent || s.campaign_id === parent) && s.name.toLowerCase().includes(term));
    return ads.filter((a) => (!parent || a.adset_id === parent) && a.name.toLowerCase().includes(term));
  }, [level, q, parent, campaigns, adsets, ads]);

  const toggle = async (id: string, on: boolean) => {
    try {
      await setStatus(level, id, on ? "active" : "paused");
      toast.success(on ? "Turned on" : "Paused");
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Ads manager</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild size="sm" className="gap-1.5">
            <Link to={`/ads/${accountId}/create`}>
              <Plus className="h-3.5 w-3.5" /> Create
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Spend</p>
          <p className="text-lg font-semibold tabular-nums">{fmtCoins(totals?.spend_coins)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Impressions</p>
          <p className="text-lg font-semibold tabular-nums">{fmtInt(totals?.impressions)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Clicks</p>
          <p className="text-lg font-semibold tabular-nums">{fmtInt(totals?.clicks)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">Conversions</p>
          <p className="text-lg font-semibold tabular-nums">{fmtInt(totals?.conversions)}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <Tabs
            value={level}
            onValueChange={(v) => {
              setLevel(v as Level);
              setParent(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="campaign">Campaigns</TabsTrigger>
              <TabsTrigger value="adset">Ad sets</TabsTrigger>
              <TabsTrigger value="ad">Ads</TabsTrigger>
            </TabsList>
          </Tabs>

          {level !== "campaign" && (
            <Select value={parent ?? "all"} onValueChange={(v) => setParent(v === "all" ? null : v)}>
              <SelectTrigger className="h-9 w-48">
                <Filter className="mr-1 h-3.5 w-3.5 opacity-60" />
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {level === "adset" ? "campaigns" : "ad sets"}</SelectItem>
                {(level === "adset" ? campaigns : adsets).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative ml-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-9 pl-8" />
          </div>
        </div>

        {loading ? (
          <div className="grid h-40 place-items-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">Is level par abhi kuch nahi hai.</p>
            <Button asChild size="sm" variant="outline">
              <Link to={`/ads/${accountId}/create`}>Create your first campaign</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-16 px-3 py-2 font-medium">On</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">
                      {level === "ad" ? "Review" : level === "adset" ? "Placements" : "Objective"}
                    </th>
                    <th className="px-3 py-2 text-right font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <Switch
                          checked={r.status === "active"}
                          onCheckedChange={(v) => toggle(r.id, v)}
                          aria-label={`Toggle ${r.name}`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          className="text-left font-medium hover:underline"
                          onClick={() => {
                            if (level === "campaign") {
                              setLevel("adset");
                              setParent(r.id);
                            } else if (level === "adset") {
                              setLevel("ad");
                              setParent(r.id);
                            }
                          }}
                        >
                          {r.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className={`capitalize ${statusTone(r.status)}`}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs capitalize text-muted-foreground">
                        {level === "ad" ? (
                          <Badge variant="outline" className={`capitalize ${statusTone(r.review_state)}`}>
                            {r.review_state}
                          </Badge>
                        ) : level === "adset" ? (
                          (r.placements ?? []).join(", ")
                        ) : (
                          String(r.objective).replace("_", " ")
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {level === "ad" ? "—" : fmtCoins(level === "campaign" ? r.budget_coins : r.daily_budget_coins)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {rows.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-3">
                  <Switch checked={r.status === "active"} onCheckedChange={(v) => toggle(r.id, v)} aria-label={`Toggle ${r.name}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="text-[11px] capitalize text-muted-foreground">
                      {level === "ad" ? r.review_state : level === "adset" ? (r.placements ?? []).join(", ") : r.objective}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {level === "ad" ? "" : fmtCoins(level === "campaign" ? r.budget_coins : r.daily_budget_coins)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
