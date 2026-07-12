import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useReadinessStatus, useUpdateReadiness } from "@/hooks/admin-os/useProductionReadiness";

const ReleaseChecklist = () => {
  const { data: readiness = [] } = useReadinessStatus();
  const update = useUpdateReadiness();
  const [editing, setEditing] = useState<Record<string, { status: string; score: number; notes: string }>>({});

  const getState = (r: any) =>
    editing[r.category] ?? { status: r.status, score: r.score, notes: r.notes ?? "" };

  return (
    <div className="space-y-4">
      {readiness.map((r: any) => {
        const s = getState(r);
        return (
          <Card key={r.category}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base capitalize">{r.category}</CardTitle>
              <Badge variant={s.status === "ready" ? "default" : s.status === "blocked" ? "destructive" : "secondary"}>
                {s.status}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Select value={s.status} onValueChange={(v) => setEditing((e) => ({ ...e, [r.category]: { ...s, status: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Score: {s.score}%</p>
                <Slider value={[s.score]} min={0} max={100} step={5}
                  onValueChange={(v) => setEditing((e) => ({ ...e, [r.category]: { ...s, score: v[0] } }))} />
              </div>
              <Input placeholder="Notes" value={s.notes}
                onChange={(e) => setEditing((prev) => ({ ...prev, [r.category]: { ...s, notes: e.target.value } }))} />
              <Button size="sm" onClick={() => update.mutate({ category: r.category, ...s })}
                disabled={update.isPending}>Save</Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReleaseChecklist;
