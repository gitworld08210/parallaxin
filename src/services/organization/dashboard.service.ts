import { supabase } from "@/integrations/supabase/client";
// DashboardService — aggregates data displayed on the org dashboard.
// Every dashboard widget must read through this service (no direct queries in UI).

import type { MemberWithProfile } from "@/types/organization/member";
import { memberService } from "./member.service";

export interface DashboardStats {
  memberCount: number;
  activeMemberCount: number;
  pendingMemberCount: number;
  departmentCount: number;
  roleCount: number;
  followerCount: number;
  postCount: number;
}

export interface DashboardActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  actor_id: string | null;
}

export const dashboardService = {
  async stats(orgId: string): Promise<DashboardStats> {
    const [orgRow, memberActive, memberPending, deptCount, roleCount] = await Promise.all([
        supabase.from("organizations").select("member_count, follower_count, post_count").eq("id", orgId).maybeSingle(),
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
        supabase.from("organization_departments").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("organization_roles").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    ]);
    return {
      memberCount: orgRow.data?.member_count ?? memberActive.count ?? 0,
      activeMemberCount: memberActive.count ?? 0,
      pendingMemberCount: memberPending.count ?? 0,
      departmentCount: deptCount.count ?? 0,
      roleCount: roleCount.count ?? 0,
      followerCount: orgRow.data?.follower_count ?? 0,
      postCount: orgRow.data?.post_count ?? 0,
    };
  },

  async recentMembers(orgId: string, limit = 4): Promise<MemberWithProfile[]> {
    return memberService.recent(orgId, limit);
  },

  async recentActivity(orgId: string, limit = 6): Promise<DashboardActivityItem[]> {
    const { data, error } = await supabase.from("organization_activity").select("id, activity_type, title, description, created_at, actor_id").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as DashboardActivityItem[]) ?? [];
  },
};
