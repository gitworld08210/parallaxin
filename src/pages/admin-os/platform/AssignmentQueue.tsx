import { useState } from "react";
import { toast } from "sonner";
import {
  useAssignments,
  useUpdateAssignmentStatus,
} from "@/hooks/platform/usePlatform";

const STATUSES = ["open", "accepted", "in_progress", "completed", "cancelled"] as const;

const AssignmentQueue = () => {
  const [status, setStatus] = useState<string>("open");
  const { data: list = [] } = useAssignments({ status });
  const update = useUpdateAssignmentStatus();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Assignment Queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Route work automatically. Manual, rule-based, or auto.
        </p>
      </header>

      <div className="flex gap-2 border-b border-border">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              status === s
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No {status} assignments.
          </div>
        )}
        {list.map((a) => (
          <div key={a.id} className="rounded-lg border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {a.entity_type} · {a.entity_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.module} · {a.method} · {a.priority}
                </p>
              </div>
              {status !== "completed" && status !== "cancelled" && (
                <div className="flex gap-2">
                  {status === "open" && (
                    <button
                      onClick={() =>
                        update.mutate(
                          { id: a.id, status: "accepted" },
                          { onSuccess: () => toast.success("Accepted") },
                        )
                      }
                      className="rounded-md border border-border px-2 py-1 text-xs"
                    >
                      Accept
                    </button>
                  )}
                  <button
                    onClick={() =>
                      update.mutate(
                        { id: a.id, status: "completed" },
                        { onSuccess: () => toast.success("Completed") },
                      )
                    }
                    className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
                  >
                    Complete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AssignmentQueue;
