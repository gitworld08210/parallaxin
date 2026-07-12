import { useQueryClient } from "@tanstack/react-query";
import { useActivity, useActivityRealtime } from "@/hooks/platform/usePlatform";

const ActivityFeed = () => {
  const qc = useQueryClient();
  const { data: events = [] } = useActivity({ limit: 100 });
  useActivityRealtime(() =>
    qc.invalidateQueries({ queryKey: ["platform", "activity"] }),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Activity Feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time operational activity across every module.
        </p>
      </header>

      <div className="space-y-2">
        {events.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No activity yet.
          </div>
        )}
        {events.map((e) => (
          <div key={e.id} className="rounded-lg border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{e.summary}</p>
              <span className="text-[10px] uppercase text-muted-foreground">
                {e.object_type}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {e.verb} · {e.department ?? "global"} ·{" "}
              {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ActivityFeed;
