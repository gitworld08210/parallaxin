// Organization member type (row + join to profile).
export type MemberId = string;

export type MemberStatus = "active" | "pending" | "suspended" | "left";

export interface Member {
  id: MemberId;
  organization_id: string;
  user_id: string;
  department_id: string | null;
  status: MemberStatus;
  joined_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberWithProfile extends Member {
  profile: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    verified: boolean;
  } | null;
  role_names: string[];
}
