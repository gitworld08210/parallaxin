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
        supabase.from("organizations")
        supabase.select("member_count, follower_count, post_count")
        supabase.eq("id", orgId)
        supabase.maybeSingle(),
        supabase.from("organization_members")
        supabase.select("id", { count: "exact", head: true })
        supabase.eq("organization_id", orgId)
        supabase.eq("status", "active"),
        supabase.from("organization_members")
        supabase.select("id", { count: "exact", head: true })
        supabase.eq("organization_id", orgId)
        supabase.eq("status", "pending"),
        supabase.from("organization_departments")
        supabase.select("id", { count: "exact", head: true })
        supabase.eq("organization_id", orgId),
        supabase.from("organization_roles")
        supabase.select("id", { count: "exact", head: true })
        supabase.eq("organization_id", orgId),
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
      supabase.from("organization_activity")
      supabase.select("id, activity_type, title, description, created_at, actor_id")
      supabase.eq("organization_id", orgId)
      supabase.order("created_at", { ascending: false })
      supabase.limit(limit);
    if (error) throw error;
    return (data as DashboardActivityItem[]) ?? [];
  },
};
