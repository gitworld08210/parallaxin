import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
};

export const AdminOSGate = ({ children }: { children?: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const isAdmin = profile?.account_type === "organization" || 
                  profile?.is_admin || 
                  profile?.is_founder || 
                  ["COO", "CEO", "HR Head", "Finance Head"].includes(profile?.role || "");

  if (!isAdmin) {
    return <Navigate to="/admin-os/no-access" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const ExecutiveGate = ({ children }: { children?: React.ReactNode }) => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const isExec = profile?.is_founder || ["COO", "CEO"].includes(profile?.role || "");

  if (!isExec) {
    return <Navigate to="/admin-os/no-access" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

