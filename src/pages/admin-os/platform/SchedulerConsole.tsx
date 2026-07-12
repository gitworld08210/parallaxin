import { useState } from "react";
import { useJobRuns, useScheduledJobs } from "@/hooks/platform/usePlatform";

const SchedulerConsole = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: jobs = [] } = useScheduledJobs();
  const { data: runs = [] } = useJobRuns(selected ?? undefined);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Scheduler Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cron for the whole company: reports, digests, cleanups, reminders.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-2">
          {jobs.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No scheduled jobs yet.
            </div>
          )}
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelected(j.id)}
              className={`w-full rounded-lg border p-3 text-left ${
                selected === j.id
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{j.name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    j.is_active
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {j.is_active ? "Active" : "Paused"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {j.job_type} · <code>{j.cron}</code>
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Recent runs
          </p>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {selected ? "No runs yet." : "Select a job to see runs."}
            </p>
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
  );
};
export default SchedulerConsole;
