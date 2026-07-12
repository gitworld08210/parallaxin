import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useValidationRuns, useRunHealthChecks, MODULE_LIST } from "@/hooks/admin-os/useProductionReadiness";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const ModuleHealthPage = () => {
  const { data: runs = [] } = useValidationRuns();
  const latestRun = runs[0];
  const { data: checks = [] } = useRunHealthChecks(latestRun?.id);

  return (
    <div className="space-y-4">
      {!latestRun && <p className="text-muted-foreground text-sm">No validation runs yet. Run one from the Overview tab.</p>}
      {MODULE_LIST.map((m) => {
        const moduleChecks = checks.filter((c: any) => c.module === m);
        const failed = moduleChecks.filter((c: any) => c.status === "fail").length;
        const warn = moduleChecks.filter((c: any) => c.status === "warn").length;
        const pass = moduleChecks.filter((c: any) => c.status === "pass").length;
        return (
          <Card key={m}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{m}</span>
                <div className="flex gap-2">
                  {failed > 0 && <Badge variant="destructive">{failed} failed</Badge>}
                  {warn > 0 && <Badge variant="secondary">{warn} warnings</Badge>}
                  {pass > 0 && failed === 0 && warn === 0 && <Badge>Healthy</Badge>}
                  {moduleChecks.length === 0 && <Badge variant="outline">No data</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            {moduleChecks.length > 0 && (
              <CardContent className="space-y-1">
                {moduleChecks.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm py-1">
                    {c.status === "pass" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> :
                     c.status === "fail" ? <XCircle className="h-3.5 w-3.5 text-red-600" /> :
                     <AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
                    <span className="flex-1">{c.check_name}</span>
                    <span className="text-xs text-muted-foreground">{c.message}</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default ModuleHealthPage;
