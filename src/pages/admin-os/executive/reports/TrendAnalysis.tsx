import { useKpiConfigs, useAnalyticsSnapshots } from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { LineChart } from "lucide-react";

const periods = ["daily","weekly","monthly","quarterly","yearly"];

const TrendAnalysis = () => {
  const { data: kpis } = useKpiConfigs();
  const [kpiCode, setKpiCode] = useState<string>("");
  const [period, setPeriod] = useState("monthly");
  const { data: snaps } = useAnalyticsSnapshots({ kpi_code: kpiCode || undefined, period, limit: 60 });

  const points = useMemo(() => {
    const rows = (snaps ?? []).slice().reverse();
    if (!rows.length) return [] as { x: string; v: number }[];
    return rows.map((s: any) => ({ x: s.period_start, v: Number(s.value ?? 0) }));
  }, [snaps]);

  const max = Math.max(1, ...points.map((p) => p.v));
  const min = Math.min(0, ...points.map((p) => p.v));

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">KPI</label>
            <Select value={kpiCode} onValueChange={setKpiCode}>
              <SelectTrigger><SelectValue placeholder="Choose KPI…" /></SelectTrigger>
              <SelectContent>
                {(kpis ?? []).map((k: any) => (
                  <SelectItem key={k.code} value={k.code}>{k.name} ({k.scope})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Period</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <LineChart className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Trend</h2>
        </div>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snapshots recorded for this KPI/period.</p>
        ) : (
          <div className="h-56 flex items-end gap-1">
            {points.map((p, i) => {
              const h = ((p.v - min) / (max - min || 1)) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/70 rounded-t"
                    style={{ height: `${Math.max(4, h)}%` }}
                    title={`${p.x}: ${p.v}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TrendAnalysis;
