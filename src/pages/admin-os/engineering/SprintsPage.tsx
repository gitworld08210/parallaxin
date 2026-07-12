import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import {
  useEngProjects,
  useEngSprints,
  useCreateEngSprint,
} from "@/hooks/admin-os/useEngineering";

const SprintsPage = () => {
  const { data: projects } = useEngProjects();
  const { data: sprints, isLoading } = useEngSprints();
  const create = useCreateEngSprint();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "",
    name: "",
    goal: "",
    status: "planned",
    start_date: "",
    end_date: "",
  });

  const submit = async () => {
    if (!form.project_id || !form.name) return;
    const payload = { ...form };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({ project_id: "", name: "", goal: "", status: "planned", start_date: "", end_date: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sprints</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Sprint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create sprint</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Project</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent>
                    {(projects ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sprint 24" />
              </div>
              <div>
                <Label>Goal</Label>
                <Textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (sprints ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
            No sprints yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(sprints ?? []).map((s: any) => {
            const project = (projects ?? []).find((p: any) => p.id === s.project_id);
            return (
              <Card key={s.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{project?.code}</p>
                    </div>
                    <Badge>{s.status}</Badge>
                  </div>
                  {s.goal && <p className="text-xs text-muted-foreground line-clamp-2">{s.goal}</p>}
                  {(s.start_date || s.end_date) && (
                    <p className="text-xs text-muted-foreground">
                      {s.start_date ?? "?"} → {s.end_date ?? "?"}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SprintsPage;
