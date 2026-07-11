// Organization invite type (mirrors public.organization_invites).
export type InviteId = string;
export type InviteStatus = "pending" | "accepted" | "declined" | "expired";

export interface Invite {
  id: InviteId;
  organization_id: string;
  invited_by: string;
  email: string | null;
  username: string | null;
  role_id: string | null;
  invite_token: string;
  status: InviteStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InviteWithMeta extends Invite {
  inviter: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  role_name: string | null;
}
