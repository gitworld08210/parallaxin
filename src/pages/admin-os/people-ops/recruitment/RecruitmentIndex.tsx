import { Link, Navigate } from "react-router-dom";
import { Briefcase, Users, MessagesSquare, FileText, BarChart3 } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useRecruitmentAnalytics } from "@/hooks/admin-os/useRecruitment";

const RecruitmentIndex = () => {
  const { hasPermission } = useEmployee();
  const { data: stats } = useRecruitmentAnalytics();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) &&
      !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_MANAGE))
    return <Navigate to="/admin-os/no-access" replace />;

  const tiles = [
    { to: "requests", label: "Hiring Requests", icon: Briefcase, desc: "Manpower requests & approvals" },
    { to: "candidates", label: "Candidates", icon: Users, desc: "Directory & applications" },
    { to: "pipeline", label: "Interview Pipeline", icon: MessagesSquare, desc: "Rounds & feedback" },
    { to: "offers", label: "Offer Center", icon: FileText, desc: "Generate & track offers" },
    { to: "analytics", label: "Analytics", icon: BarChart3, desc: "Funnel, conversion, time-to-hire" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            PEOPLE OPS · RECRUITMENT
          </p>
          <h1 className="text-2xl font-bold">Hiring Center</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Requests", value: stats?.openRequests ?? 0 },
          { label: "Active Candidates", value: stats?.activeCandidates ?? 0 },
          { label: "In Interview", value: stats?.interviewsInProgress ?? 0 },
          { label: "Offer Acceptance", value: `${stats?.offerAcceptanceRate ?? 0}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
              {s.label.toUpperCase()}
            </p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group rounded-xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <t.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-muted-foreground truncate">{t.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecruitmentIndex;
