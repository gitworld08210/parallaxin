/**
 * PermissionGate — render children only when the current org context grants the
 * requested permission. Owner bypass is handled inside OrganizationProvider.
 *
 * Server-side authorization is still the source of truth: never treat a
 * successful UI render as authorization for a mutation.
 */
import type { ReactNode } from "react";
import { useOrganizationContext } from "@/contexts/OrganizationProvider";
import type { OrgPermissionKey } from "@/features/organization/permissions.registry";

interface PermissionGateProps {
  permission: OrgPermissionKey | OrgPermissionKey[];
  /** When true, require every permission (default: any). */
  mode?: "any" | "all";
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGate = ({
  permission,
  mode = "any",
  fallback = null,
  children,
}: PermissionGateProps) => {
  const { hasPermission, loading } = useOrganizationContext();
  if (loading) return null;
  const keys = Array.isArray(permission) ? permission : [permission];
  const ok = mode === "all" ? keys.every(hasPermission) : keys.some(hasPermission);
  return <>{ok ? children : fallback}</>;
};
