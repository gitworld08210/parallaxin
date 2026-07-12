import { useKpiConfigs, useSaveKpiConfig, useAnalyticsSnapshots } from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Award } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const scopes = ["company","hr","finance","support","verification","engineering","security"];

const ScorecardsPage = () => {
  const { data: kpis } = useKpiConfigs();
  const { data: snaps } = useAnalyticsSnapshots({ period: "monthly", limit: 500 });
  const save = useSaveKpiConfig();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ code: "", name: "", category: "operational", scope: "company", direction: "higher_better" });

  const latest = (code: string, scope: string) =>
    snaps?.find((s: any) => s.kpi_code === code && s.scope === scope)?.value;

  const submit = async () => {
    if (!form.code || !form.name) { toast.error("Code and name required"); return; }
    await save.mutateAsync(form);
    toast.success("KPI saved");
    setOpen(false);
    setForm({ code: "", name: "", category: "operational", scope: "company", direction: "higher_better" });
  };

  const scoreGroups = scopes.map((s) => ({
    scope: s,
    items: (kpis ?? []).filter((k: any) => k.scope === s),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Executive scorecards summarize each area against target thresholds.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New KPI</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New KPI</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} /></div>
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} /></div>
                <div>
                  <Label>Scope</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({...form, scope: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{scopes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Unit</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({...form, unit: e.target.value})} /></div>
                <div><Label>Target</Label><Input type="number" value={form.target_value ?? ""} onChange={(e) => setForm({...form, target_value: Number(e.target.value)})} /></div>
                <div>
                  <Label>Direction</Label>
                  <Select value={form.direction} onValueChange={(v) => setForm({...form, direction: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="higher_better">Higher is better</SelectItem>
                      <SelectItem value="lower_better">Lower is better</SelectItem>
                      <SelectItem value="target">Meet target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {scoreGroups.map((g) => (
        <Card key={g.scope} className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-primary" />
            <h2 className="font-semibold capitalize">{g.scope} scorecard</h2>
          </div>
          {g.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No KPIs configured.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((k: any) => {
                const val = latest(k.code, k.scope);
                const ok = k.target_value == null || val == null
                  ? null
                  : k.direction === "higher_better" ? val >= k.target_value
                  : k.direction === "lower_better" ? val <= k.target_value
                  : Math.abs(val - k.target_value) < (k.target_value * 0.05);
                return (
                  <div key={k.id} className="rounded-lg border border-border/60 p-3">
                    <p className="text-xs text-muted-foreground">{k.category}</p>
                    <p className="font-medium">{k.name}</p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-2xl font-bold">
                        {val ?? "—"} <span className="text-xs font-normal text-muted-foreground">{k.unit}</span>
                      </span>
                      {k.target_value != null && (
                        <span className={ok === false ? "text-xs text-red-600" : ok ? "text-xs text-emerald-600" : "text-xs text-muted-foreground"}>
                          target {k.target_value}{k.unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default ScorecardsPage;
