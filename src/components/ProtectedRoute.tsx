import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

export const ProtectedRoute = () => {
  const { user, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: loc.pathname }} replace />;

  // Funnel new users through the first-run flow once.
  const needsOnboarding = profile && !profile.onboarded_at;
  if (needsOnboarding && loc.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};
