import { useAuth } from "@/contexts/AuthProvider";
import {
  useNotificationDeliveries,
  useNotificationTemplates,
} from "@/hooks/platform/usePlatform";

const NotificationCenter = () => {
  const { user } = useAuth();
  const { data: deliveries = [] } = useNotificationDeliveries(user?.id);
  const { data: templates = [] } = useNotificationTemplates();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Notification Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every module notifies through this engine. Multi-channel delivery + templates.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your deliveries
          </p>
          {deliveries.length === 0 && (
            <p className="text-sm text-muted-foreground">No deliveries yet.</p>
          )}
          <div className="space-y-2">
            {deliveries.map((d) => {
              const payload = (d.payload ?? {}) as { title?: string; body?: string };
              return (
                <div
                  key={d.id}
                  className="rounded-md border border-border/60 bg-background p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{payload.title ?? d.template_key ?? "Notification"}</p>
                    <span className="text-[10px] uppercase text-muted-foreground">{d.channel}</span>
                  </div>
                  {payload.body && (
                    <p className="mt-1 text-xs text-muted-foreground">{payload.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(d.created_at).toLocaleString()} · {d.status}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Templates ({templates.length})
          </p>
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          )}
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="rounded-md border border-border/60 p-3 text-sm">
                <p className="font-semibold">{t.key}</p>
                <p className="text-xs text-muted-foreground">
                  {t.category} · {(t.default_channels ?? []).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
export default NotificationCenter;
