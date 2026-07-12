import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiPredictions, useSavePrediction } from "@/hooks/admin-os/useExecutiveAi";
import { TrendingUp } from "lucide-react";

const CATS = ["hiring", "attrition", "training", "capacity", "promotion", "risk", "growth"];

const PredictionsPage = () => {
  const { data = [] } = useAiPredictions();
  const save = useSavePrediction();
  const [form, setForm] = useState<any>({ metric: "", category: "hiring", horizon: "quarter", confidence: 0.6, notes: "", forecast_json: "{}" });

  const submit = () => {
    try {
      const forecast = JSON.parse(form.forecast_json || "{}");
      save.mutate({ ...form, forecast });
    } catch {
      alert("Forecast must be valid JSON");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> New Forecast</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Metric</Label><Input value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Horizon</Label><Input value={form.horizon} onChange={(e) => setForm({ ...form, horizon: e.target.value })} /></div>
          <div><Label>Confidence (0-1)</Label><Input type="number" min={0} max={1} step="0.05" value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Forecast (JSON)</Label><Textarea rows={4} value={form.forecast_json} onChange={(e) => setForm({ ...form, forecast_json: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={submit} disabled={!form.metric}>Save Forecast</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {data.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {p.metric}
                <Badge variant="outline">{p.category}</Badge>
                <Badge>forecast</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-xs text-muted-foreground">Horizon: {p.horizon} · Confidence: {Math.round((p.confidence ?? 0) * 100)}%</p>
              {p.notes && <p>{p.notes}</p>}
              <pre className="text-[11px] bg-muted/40 rounded p-2 overflow-auto">{JSON.stringify(p.forecast, null, 2)}</pre>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No predictions yet.</CardContent></Card>}
      </div>
    </div>
  );
};

export default PredictionsPage;
