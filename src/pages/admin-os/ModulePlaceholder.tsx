import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft, Hammer } from "lucide-react";
import { ADMIN_MODULES } from "@/features/admin-os/modules.config";
import { useEmployee } from "@/hooks/admin-os/useEmployee";

const ModulePlaceholder = () => {
  const { slug } = useParams();
  const { hasPermission } = useEmployee();

  const mod = ADMIN_MODULES.find((m) => m.slug === slug);
  if (!mod) return <Navigate to="/admin-os" replace />;
  if (!hasPermission(mod.permission))
    return <Navigate to="/admin-os/no-access" replace />;

  const Icon = mod.icon;

  return (
    <div className="max-w-3xl">
      <Link
        to="/admin-os"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Overview
      </Link>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-8">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
              MODULE · PHASE {mod.phase}
            </p>
            <h1 className="text-2xl font-bold">{mod.label}</h1>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground max-w-xl">
          {mod.tagline}. This module's foundation is registered — routes,
          permissions, and navigation are wired. Business features land in
          <span className="font-semibold text-foreground"> Phase {mod.phase}</span>.
        </p>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-border p-4 bg-muted/20">
          <Hammer className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-semibold">
              No business features are implemented in Phase 1.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Per the Aurelix Admin OS phase plan, Phase 1.1 – 1.3 establish
              vision, architecture, and authentication foundations only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
