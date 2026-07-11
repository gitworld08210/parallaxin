// Organization role type.
export type RoleId = string;

export interface Role {
  id: RoleId;
  organization_id: string;
  name: string;
  description: string | null;
  priority: number;
  is_system: boolean;
  is_default: boolean;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
