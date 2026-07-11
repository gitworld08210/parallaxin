// Organization permission type.
export type PermissionId = string;

export interface Permission {
  id: PermissionId;
  module: string;
  permission_key: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RolePermissionLink {
  role_id: string;
  permission_id: string;
}
