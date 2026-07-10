// OrganizationDashboard — page scaffold. Build feature UI here.

import DashboardHeader from "@/components/organization/dashboard/DashboardHeader";
import DashboardStats from "@/components/organization/dashboard/DashboardStats";
import QuickActions from "@/components/organization/dashboard/QuickActions";
import RecentActivity from "@/components/organization/dashboard/RecentActivity";
import RecentMembers from "@/components/organization/dashboard/RecentMembers";
import RecentProjects from "@/components/organization/dashboard/RecentProjects";
import OrganizationOverview from "@/components/organization/dashboard/OrganizationOverview";

export default function OrganizationDashboard() {
  return (
    <div className="space-y-8">
      <DashboardHeader />

      <DashboardStats />

      <div className="grid gap-6 xl:grid-cols-2">
        <QuickActions />

        <RecentActivity />
      </div>

      <OrganizationOverview />

      <div className="grid gap-6 xl:grid-cols-2">
        <RecentMembers />

        <RecentProjects />
      </div>
    </div>
  );
}
