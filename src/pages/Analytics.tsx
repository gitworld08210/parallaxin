import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty/EmptyState";
import { BarChart3 } from "lucide-react";

const KPI = ({ label, value }: { label: string; value: string }) => (
  <GlassCard className="p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-bold mt-1">{value}</p>
    <p className="text-[11px] text-muted-foreground mt-1">+0%</p>
  </GlassCard>
);

export default function Analytics() {
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Analytics" right={<span className="text-xs text-muted-foreground">Last 30 Days</span>} />
      <div className="p-4 space-y-5">
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <GlassCard>
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="text-3xl font-bold mt-1">0</p>
              <p className="text-[11px] text-muted-foreground mt-1">+0%</p>
              <div className="mt-4 h-40 rounded-lg bg-muted/20 grid place-items-center text-xs text-muted-foreground">
                No data yet
              </div>
            </GlassCard>
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Engagement" value="0" />
              <KPI label="Profile Visits" value="0" />
              <KPI label="New Followers" value="0" />
              <KPI label="Impressions" value="0" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-3">Top Performing Content</p>
              <EmptyState icon={BarChart3} title="No content yet" subtitle="Publish posts to see analytics here." />
            </div>
          </TabsContent>

          <TabsContent value="content"><EmptyState icon={BarChart3} title="No content data" subtitle="Stats appear after you publish." /></TabsContent>
          <TabsContent value="audience"><EmptyState icon={BarChart3} title="No audience data" subtitle="Grow your following to see insights." /></TabsContent>
          <TabsContent value="earnings"><EmptyState icon={BarChart3} title="No earnings data" subtitle="Enable monetization to start earning." /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
