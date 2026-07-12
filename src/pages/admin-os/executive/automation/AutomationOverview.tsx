import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationMetrics } from "@/hooks/admin-os/useAutomation";
import { Activity, CheckCircle2, XCircle, Clock, Workflow, Bell, ArrowUpRight, TrendingUp } from "lucide-react";

const stat = (label: string, value: string | number, Icon: any, hint?: string) => (
  <Card>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const AutomationOverview = () => {
  const { data } = useAutomationMetrics();
  const m = data ?? { total: 0, active: 0, failed: 0, totalRuns: 0, successRuns: 0, failedRuns: 0, pendingRuns: 0, avgDurationMs: 0, pendingReminders: 0, openEscalations: 0 };
  const successRate = m.totalRuns ? Math.round((m.successRuns / m.totalRuns) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stat("Total Automations", m.total, Workflow)}
        {stat("Active", m.active, CheckCircle2, "Enabled and running")}
        {stat("With Failures", m.failed, XCircle)}
        {stat("Avg Run Time", `${Math.round((m.avgDurationMs || 0))}ms`, Clock)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stat("Total Runs (200)", m.totalRuns, Activity)}
        {stat("Success Rate", `${successRate}%`, TrendingUp)}
        {stat("Pending Reminders", m.pendingReminders, Bell)}
        {stat("Open Escalations", m.openEscalations, ArrowUpRight)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Governance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Automations may never grant permissions, change governance, delete records, bypass approvals or modify audit logs.</p>
          <p>• Every execution generates immutable audit logs.</p>
          <p>• Failed automations support retry and administrator review.</p>
          <p>• AI modules may only recommend automations; executive authorization is required to activate them.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutomationOverview;
