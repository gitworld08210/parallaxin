/**
 * AdminOSGate — routes only reachable by active employees with
 * `admin_os.access`. Unauth users → /auth. Non-employees → /.
 * First-login employees are redirected to the first-login flow.
 */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS, ACTIVE_EMPLOYMENT_STATUSES } from "@/features/admin-os/permissions";

export const AdminOSGate = () => {
  const { user, loading: authLoading } = useAuth();
  const { employee, hasPermission, loading } = useEmployee();
  const location = useLocation();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (!employee) {
    return <Navigate to="/admin-os/no-access" replace state={{ reason: "not_employee" }} />;
  }

  if (!ACTIVE_EMPLOYMENT_STATUSES.has(employee.employment_status)) {
    return <Navigate to="/admin-os/no-access" replace state={{ reason: employee.employment_status }} />;
  }

  if (!hasPermission(ADMIN_PERMISSIONS.ADMIN_OS_ACCESS)) {
    return <Navigate to="/admin-os/no-access" replace state={{ reason: "no_permission" }} />;
  }

  // First-login enforcement — force password change + 2FA setup before
  // any module route is reachable.
  const needsFirstLogin =
    employee.requires_password_change ||
    employee.requires_2fa_setup ||
    !employee.policies_accepted_at;

  const onFirstLogin = location.pathname.startsWith("/admin-os/first-login");
  if (needsFirstLogin && !onFirstLogin) {
    return <Navigate to="/admin-os/first-login" replace />;
  }
  if (!needsFirstLogin && onFirstLogin) {
    return <Navigate to="/admin-os" replace />;
  }

  return <Outlet />;
};
