import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useReleaseHistory, useCreateRelease, useApproveRelease, useValidationRuns, useReadinessStatus,
} from "@/hooks/admin-os/useProductionReadiness";
import { format } from "date-fns";
import { Rocket, CheckCircle2 } from "lucide-react";

const ReleasesPage = () => {
  const { data: releases = [] } = useReleaseHistory();
  const { data: runs = [] } = useValidationRuns();
  const { data: readiness = [] } = useReadinessStatus();
  const create = useCreateRelease();
  const approve = useApproveRelease();
  const [form, setForm] = useState({ version: "", release_type: "production", release_notes: "", validation_run_id: "" });

  const overall = readiness.length ? Math.round(readiness.reduce((s: number, r: any) => s + r.score, 0) / readiness.length) : 0;
  const canApprove = overall >= 80;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Rocket className="h-4 w-4" />Record New Release</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Version (e.g. v1.0.0)" value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })} />
          <Select value={form.release_type} onValueChange={(v) => setForm({ ...form, release_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="hotfix">Hotfix</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.validation_run_id || "none"} onValueChange={(v) => setForm({ ...form, validation_run_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Link validation run" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No run linked</SelectItem>
              {runs.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.run_type} · {r.status} · {format(new Date(r.started_at), "MMM d HH:mm")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Release notes" className="md:col-span-2" value={form.release_notes}
            onChange={(e) => setForm({ ...form, release_notes: e.target.value })} />
          <div className="md:col-span-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Current readiness: <span className="font-semibold">{overall}%</span> · release requires ≥80%</p>
            <Button
              onClick={() => { create.mutate({ ...form, validation_run_id: form.validation_run_id || undefined }); setForm({ version: "", release_type: "production", release_notes: "", validation_run_id: "" }); }}
              disabled={!form.version || create.isPending}>Record Release</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Release History</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {releases.length === 0 && <p className="text-sm text-muted-foreground">No releases yet.</p>}
          {releases.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.version}</span>
                  <Badge variant="outline">{r.release_type}</Badge>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge>
                </div>
                {r.release_notes && <p className="text-xs text-muted-foreground mt-1">{r.release_notes}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{format(new Date(r.created_at), "PPp")}</p>
              </div>
              {r.status === "draft" && (
                <Button size="sm" variant="outline" disabled={!canApprove || approve.isPending}
                  onClick={() => approve.mutate(r.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReleasesPage;
