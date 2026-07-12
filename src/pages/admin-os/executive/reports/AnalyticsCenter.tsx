import { useCompanyAnalytics, useDepartmentAnalytics } from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AnalyticsCenter = () => {
  const { data: ca } = useCompanyAnalytics();
  const { data: depts } = useDepartmentAnalytics();
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-semibold mb-3">Company Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Employees</p><p className="text-lg font-bold">{ca?.totalEmployees ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Departments</p><p className="text-lg font-bold">{ca?.totalDepartments ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Hires (30d)</p><p className="text-lg font-bold">{ca?.hires30d ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Leaves (30d)</p><p className="text-lg font-bold">{ca?.leaves30d ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Promotions (90d)</p><p className="text-lg font-bold">{ca?.promotions90d ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Offers</p><p className="text-lg font-bold">{ca?.totalOffers ?? "—"}</p></div>
          <div><p className="text-muted-foreground text-xs">Perf. Cycles</p><p className="text-lg font-bold">{ca?.performanceCycles ?? "—"}</p></div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Department Analytics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr className="border-b border-border/60">
                <th className="py-2">Department</th>
                <th>Employees</th>
                <th>Leaves (30d)</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {(depts ?? []).map((d: any) => (
                <tr key={d.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td>{d.employeeCount}</td>
                  <td>{d.leaveCount}</td>
                  <td>
                    <Badge variant={d.healthScore >= 80 ? "default" : d.healthScore >= 60 ? "secondary" : "destructive"}>
                      {d.healthScore}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!depts?.length && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No departments to analyze.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsCenter;
