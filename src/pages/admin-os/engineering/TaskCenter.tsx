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
import { Plus, ListTodo, Loader2 } from "lucide-react";
import {
  useEngProjects,
  useEngSprints,
  useEngTasks,
  useCreateEngTask,
} from "@/hooks/admin-os/useEngineering";

const TaskCenter = () => {
  const { data: projects } = useEngProjects();
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const filters: any = {};
  if (filterProject !== "all") filters.projectId = filterProject;
  if (filterStatus !== "all") filters.status = filterStatus;
  const { data, isLoading } = useEngTasks(filters);
  const { data: sprints } = useEngSprints(filters.projectId);
  const create = useCreateEngTask();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    project_id: "",
    sprint_id: "",
    title: "",
    description: "",
    task_type: "task",
    priority: "medium",
    status: "todo",
    story_points: "",
  });

  const submit = async () => {
    if (!form.project_id || !form.title) return;
    const payload: any = { ...form };
    if (!payload.sprint_id) delete payload.sprint_id;
    if (!payload.story_points) delete payload.story_points;
    else payload.story_points = Number(payload.story_points);
    await create.mutateAsync(payload);
    setOpen(false);
    setForm({
      project_id: "",
      sprint_id: "",
      title: "",
      description: "",
      task_type: "task",
      priority: "medium",
      status: "todo",
      story_points: "",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Task Center</h2>
        <div className="flex items-center gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {(projects ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="qa">QA</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Project</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v, sprint_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger>
                    <SelectContent>
                      {(projects ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {form.project_id && (sprints ?? []).length > 0 && (
                  <div>
                    <Label>Sprint (optional)</Label>
                    <Select value={form.sprint_id} onValueChange={(v) => setForm({ ...form, sprint_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Backlog" /></SelectTrigger>
                      <SelectContent>
                        {(sprints ?? []).filter((s: any) => s.project_id === form.project_id).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                        <SelectItem value="spike">Spike</SelectItem>
                        <SelectItem value="chore">Chore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Points</Label>
                    <Input type="number" value={form.story_points} onChange={(e) => setForm({ ...form, story_points: e.target.value })} />
                  </div>
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
      </div>

      {isLoading ? (
        <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ListTodo className="mx-auto mb-3 h-8 w-8 opacity-50" />No tasks match.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((t: any) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{t.task_id}</span>
                    <Badge variant="outline" className="text-[10px]">{t.task_type}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{t.priority}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{t.title}</p>
                </div>
                <Badge>{t.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCenter;
