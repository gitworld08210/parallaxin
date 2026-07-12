import { useState } from "react";
import { useWorkflows, useWorkflowRuns } from "@/hooks/platform/usePlatform";

const WorkflowViewer = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: list = [], isLoading } = useWorkflows();
  const { data: runs = [] } = useWorkflowRuns(selected ?? undefined);
  const wf = list.find((w) => w.id === selected);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Workflow Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reusable business processes. Drag-and-drop editor coming later — JSON viewer for now.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && list.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No workflows defined yet.
            </div>
          )}
          {list.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w.id)}
              className={`w-full rounded-lg border p-3 text-left ${
                selected === w.id
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/40"
              }`}
            >
              <p className="font-semibold text-sm">{w.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {w.key} · v{w.version} · {w.owner_department ?? "—"}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {!wf ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Select a workflow to inspect.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <p className="text-sm font-semibold">{wf.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{wf.description}</p>
                <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-background p-3 text-[11px]">
                  {JSON.stringify(wf.steps, null, 2)}
                </pre>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recent runs
                </p>
                {runs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No runs yet.</p>
                ) : (
                  <div className="space-y-1">
                    {runs.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-md border border-border/60 p-2 text-xs"
                      >
                        <span>{new Date(r.created_at).toLocaleString()}</span>
                        <span className="font-semibold">{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default WorkflowViewer;
