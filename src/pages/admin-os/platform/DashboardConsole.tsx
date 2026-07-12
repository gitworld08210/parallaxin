import { useState } from "react";
import {
  useDashboards,
  useDashboardWidgets,
} from "@/hooks/platform/usePlatform";

const DashboardConsole = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: list = [] } = useDashboards();
  const { data: widgets = [] } = useDashboardWidgets(selected ?? undefined);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Dashboard Engine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reusable widget dashboards. Every department composes its own from shared widgets.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-2">
          {list.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No dashboards yet.
            </div>
          )}
          {list.map((d) => (
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
                {d.owner_department ?? "shared"} · {d.layout}
              </p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {selected && widgets.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground sm:col-span-2">
              No widgets configured.
            </div>
          )}
          {widgets.map((w) => (
            <div key={w.id} className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">{w.widget_type}</p>
              <p className="mt-1 font-semibold">{w.title ?? "Untitled widget"}</p>
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-background p-2 text-[10px]">
                {JSON.stringify(w.config, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DashboardConsole;
