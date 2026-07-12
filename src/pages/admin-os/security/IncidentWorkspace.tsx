import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import {
  useSecurityIncident,
  useIncidentUpdates,
  useAddIncidentUpdate,
  useUpdateIncident,
} from "@/hooks/admin-os/useSecurity";

const stages = ["open", "investigating", "contained", "recovered", "closed"];

const IncidentWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const { data: incident } = useSecurityIncident(id);
  const { data: updates = [] } = useIncidentUpdates(id);
  const addUpdate = useAddIncidentUpdate();
  const updateIncident = useUpdateIncident();
  const [note, setNote] = useState("");
  const [rootCause, setRootCause] = useState("");

  if (!incident) return <p className="text-sm text-muted-foreground">Loading incident…</p>;

  const changeStatus = async (status: string) => {
    const patch: Parameters<typeof updateIncident.mutateAsync>[0]["patch"] = { status };
    if (status === "contained") patch.contained_at = new Date().toISOString();
    if (status === "recovered") patch.recovered_at = new Date().toISOString();
    if (status === "closed") patch.closed_at = new Date().toISOString();
    await updateIncident.mutateAsync({ id: incident.id, patch });
  };

  return (
    <div className="space-y-4">
      <Link to="/admin-os/security/incidents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to incidents
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{incident.incident_code}</p>
              <CardTitle className="text-xl">{incident.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{incident.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs capitalize text-destructive">{incident.severity}</span>
              <Select value={incident.status} onValueChange={changeStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stages.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Detected</p><p>{new Date(incident.detected_at).toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Contained</p><p>{incident.contained_at ? new Date(incident.contained_at).toLocaleString() : "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Closed</p><p>{incident.closed_at ? new Date(incident.closed_at).toLocaleString() : "—"}</p></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Timeline & Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {updates.map((u) => (
                <div key={u.id} className="rounded-md border border-border/60 p-2 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{u.update_type} · {new Date(u.created_at).toLocaleString()}</p>
                  <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
                </div>
              ))}
              {updates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add investigation note or action taken…" />
            <Button
              size="sm"
              onClick={async () => {
                if (!note.trim() || !id) return;
                await addUpdate.mutateAsync({ incidentId: id, body: note });
                setNote("");
              }}
            >Append update</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Root Cause Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={rootCause || incident.root_cause || ""} onChange={(e) => setRootCause(e.target.value)} placeholder="Document root cause…" rows={8} />
            <Button
              size="sm"
              onClick={() => updateIncident.mutate({ id: incident.id, patch: { root_cause: rootCause } })}
              disabled={!rootCause.trim()}
            >Save root cause</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IncidentWorkspace;
