import type { ReactNode } from "react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import type { AdminPermissionKey } from "@/features/admin-os/permissions";

export const AdminPermissionGate = ({
  permission,
  fallback = null,
  children,
}: {
  permission: AdminPermissionKey;
  fallback?: ReactNode;
  children: ReactNode;
}) => {
  const { hasPermission, loading } = useEmployee();
  if (loading) return null;
  return <>{hasPermission(permission) ? children : fallback}</>;
};
