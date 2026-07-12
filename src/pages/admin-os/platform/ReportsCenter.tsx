import { useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";
import {
  useReportDefinitions,
  useReportRuns,
  useRunReport,
} from "@/hooks/platform/usePlatform";

const ReportsCenter = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: defs = [] } = useReportDefinitions();
  const { data: runs = [] } = useReportRuns(selected ?? undefined);
  const run = useRunReport();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Reports Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Standardized reports. Run on demand or on schedule; export as CSV.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-2">
          {defs.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No report definitions yet.
            </div>
          )}
          {defs.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`w-full rounded-lg border p-3 text-left ${
                selected === d.id
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/40"
              }`}
            >
              <p className="font-semibold text-sm">{d.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {d.category} · {d.source}
              </p>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {selected && (
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <button
                onClick={() =>
                  run.mutate(
                    { definition_id: selected },
                    { onSuccess: () => toast.success("Report queued") },
                  )
                }
                disabled={run.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Run now
              </button>
            </div>
          )}
          <div className="rounded-xl border border-border/60 bg-card p-4">
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
        </div>
      </div>
    </div>
  );
};
export default ReportsCenter;
