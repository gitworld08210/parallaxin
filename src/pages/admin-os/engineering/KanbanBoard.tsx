import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEngProjects, useEngTasks, useUpdateEngTask } from "@/hooks/admin-os/useEngineering";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "qa", label: "QA" },
  { key: "done", label: "Done" },
];

const KanbanBoard = () => {
  const { data: projects } = useEngProjects();
  const [projectId, setProjectId] = useState<string>("all");
  const filters = projectId === "all" ? {} : { projectId };
  const { data, isLoading } = useEngTasks(filters);
  const update = useUpdateEngTask();

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    COLUMNS.forEach((c) => (g[c.key] = []));
    (data ?? []).forEach((t: any) => {
      const k = COLUMNS.find((c) => c.key === t.status)?.key ?? "todo";
      g[k].push(t);
    });
    return g;
  }, [data]);

  const move = (id: string, status: string) => update.mutate({ id, status });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Kanban Board</h2>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projects ?? []).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} — {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <div key={col.key} className="rounded-lg border bg-muted/20 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide">{col.label}</p>
                <Badge variant="secondary">{grouped[col.key].length}</Badge>
              </div>
              <div className="space-y-2">
                {grouped[col.key].map((t: any) => (
                  <Card key={t.id} className="cursor-pointer">
                    <CardContent className="p-2.5 space-y-2">
                      <p className="text-xs font-mono text-muted-foreground">{t.task_id}</p>
                      <p className="text-sm font-medium line-clamp-2">{t.title}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {t.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {t.task_type}
                        </Badge>
                      </div>
                      <Select value={t.status} onValueChange={(v) => move(t.id, v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMNS.map((c) => (
                            <SelectItem key={c.key} value={c.key}>
                              {c.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
