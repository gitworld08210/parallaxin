import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAutomations, useToggleAutomation, useDeleteAutomation, useRunAutomation } from "@/hooks/admin-os/useAutomation";
import { Link } from "react-router-dom";
import { Play, Trash2, Pencil, Plus } from "lucide-react";

const AutomationsList = () => {
  const { data = [], isLoading } = useAutomations();
  const [search, setSearch] = useState("");
  const toggle = useToggleAutomation();
  const del = useDeleteAutomation();
  const run = useRunAutomation();

  const filtered = data.filter((a: any) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input placeholder="Search automations..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Button asChild><Link to="/admin-os/executive/automation/builder"><Plus className="h-4 w-4 mr-1" /> New Automation</Link></Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="grid gap-3">
        {filtered.map((a: any) => (
          <Card key={a.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {a.name}
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                    <Badge variant="outline">{a.trigger_type}</Badge>
                    {a.priority !== "normal" && <Badge variant="destructive">{a.priority}</Badge>}
                  </CardTitle>
                  {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={a.is_enabled} onCheckedChange={(v) => toggle.mutate({ id: a.id, enabled: v })} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex gap-4">
                <span>Runs: {a.run_count}</span>
                <span>Failures: {a.failure_count}</span>
                <span>Last: {a.last_run_at ? new Date(a.last_run_at).toLocaleString() : "Never"}</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => run.mutate(a.id)}><Play className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" asChild><Link to={`/admin-os/executive/automation/builder/${a.id}`}><Pencil className="h-3.5 w-3.5" /></Link></Button>
                <Button size="sm" variant="ghost" onClick={() => window.confirm("Delete automation?") && del.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && !isLoading && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No automations yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default AutomationsList;
