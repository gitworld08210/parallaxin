import { Navigate } from "react-router-dom";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import { useRecruitmentAnalytics } from "@/hooks/admin-os/useRecruitment";

const RecruitmentAnalytics = () => {
  const { hasPermission } = useEmployee();
  const { data, isLoading } = useRecruitmentAnalytics();

  if (!hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_VIEW) &&
      !hasPermission(ADMIN_PERMISSIONS.PEOPLE_OPS_RECRUITMENT_MANAGE))
    return <Navigate to="/admin-os/no-access" replace />;

  const cards = data ? [
    { label: "Total Candidates", value: data.totalCandidates },
    { label: "Active Candidates", value: data.activeCandidates },
    { label: "Active Applications", value: data.activeApplications },
    { label: "Open Requests", value: data.openRequests },
    { label: "In Interview", value: data.interviewsInProgress },
    { label: "Total Hired", value: data.totalHired },
    { label: "Offer Acceptance Rate", value: `${data.offerAcceptanceRate}%` },
    { label: "Offer Rejection Rate", value: `${data.offerRejectionRate}%` },
  ] : [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">PEOPLE OPS · RECRUITMENT</p>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">{c.label.toUpperCase()}</p>
              <p className="mt-1 text-2xl font-bold">{c.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecruitmentAnalytics;
