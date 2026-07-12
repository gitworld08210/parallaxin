import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiRecommendations, useSaveRecommendation, useReviewRecommendation } from "@/hooks/admin-os/useExecutiveAi";
import { Lightbulb, CheckCircle2, XCircle } from "lucide-react";

const CATEGORIES = ["general", "hiring", "training", "security", "operations", "policy", "risk", "automation"];

const RecommendationsPage = () => {
  const { data = [] } = useAiRecommendations();
  const save = useSaveRecommendation();
  const review = useReviewRecommendation();
  const [form, setForm] = useState<any>({ title: "", category: "general", recommendation: "", reasoning: "", confidence: 0.7, business_impact: "" });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4" /> New Recommendation</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Recommendation</Label><Textarea value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Reasoning / Supporting Data</Label><Textarea value={form.reasoning} onChange={(e) => setForm({ ...form, reasoning: e.target.value })} /></div>
          <div><Label>Confidence (0-1)</Label><Input type="number" step="0.05" min={0} max={1} value={form.confidence} onChange={(e) => setForm({ ...form, confidence: Number(e.target.value) })} /></div>
          <div><Label>Business Impact</Label><Input value={form.business_impact} onChange={(e) => setForm({ ...form, business_impact: e.target.value })} /></div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={() => save.mutate(form)} disabled={!form.title || !form.recommendation}>Save Recommendation</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {data.map((r: any) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {r.title}
                  <Badge variant="outline">{r.category}</Badge>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "dismissed" ? "secondary" : "outline"}>{r.status}</Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  Confidence: {Math.round((r.confidence ?? 0) * 100)}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{r.recommendation}</p>
              {r.reasoning && <p className="text-muted-foreground text-xs"><strong>Reasoning:</strong> {r.reasoning}</p>}
              {r.business_impact && <p className="text-xs"><strong>Impact:</strong> {r.business_impact}</p>}
              {r.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => review.mutate({ id: r.id, status: "approved" })}><CheckCircle2 className="h-3 w-3 mr-1" /> Approve for action</Button>
                  <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, status: "dismissed" })}><XCircle className="h-3 w-3 mr-1" /> Dismiss</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No recommendations yet.</CardContent></Card>}
      </div>
    </div>
  );
};

export default RecommendationsPage;
