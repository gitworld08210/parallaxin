/**
 * ExecutiveGate — restricts routes to Founder Office employees only.
 * Non-founder employees are bounced back to Admin OS; unauthenticated
 * users to /auth. Every access is a Founder Office context.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ACTIVE_EMPLOYMENT_STATUSES } from "@/features/admin-os/permissions";

const Spinner = () => (
  <div className="min-h-screen grid place-items-center bg-background">
    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

export const ExecutiveGate = () => {
  const { user, loading: authLoading } = useAuth();
  const { employee, loading } = useEmployee();
  const location = useLocation();

  if (authLoading || loading) return <Spinner />;
  if (!user) return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;

  if (!employee) {
    return <Navigate to="/admin-os/no-access" replace state={{ reason: "not_employee" }} />;
  }
  if (!ACTIVE_EMPLOYMENT_STATUSES.has(employee.employment_status)) {
    return <Navigate to="/admin-os/no-access" replace state={{ reason: employee.employment_status }} />;
  }
  if (employee.department?.key !== "founder_office") {
    return <Navigate to="/admin-os" replace state={{ reason: "not_founder_office" }} />;
  }

  // First-login enforcement (shared with Admin OS)
  const needsFirstLogin =
    employee.requires_password_change ||
    employee.requires_2fa_setup ||
    !employee.policies_accepted_at;
  const onFirstLogin = location.pathname.startsWith("/admin-os/first-login");
  if (needsFirstLogin && !onFirstLogin) return <Navigate to="/admin-os/first-login" replace />;

  return <Outlet />;
};

export default ExecutiveGate;
