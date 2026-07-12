import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useValidationRuns, useReadinessStatus, useIssues, useRunValidation,
} from "@/hooks/admin-os/useProductionReadiness";
import { Play, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColor = (s: string) =>
  s === "passed" || s === "ready" ? "text-green-600" :
  s === "failed" || s === "blocked" ? "text-red-600" :
  s === "running" ? "text-blue-600" : "text-amber-600";

const ProductionOverview = () => {
  const { data: runs = [] } = useValidationRuns();
  const { data: readiness = [] } = useReadinessStatus();
  const { data: issues = [] } = useIssues();
  const runValidation = useRunValidation();

  const latestRun = runs[0];
  const readyCount = readiness.filter((r: any) => r.status === "ready").length;
  const overallScore = readiness.length
    ? Math.round(readiness.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / readiness.length)
    : 0;
  const openIssues = issues.filter((i: any) => i.status !== "resolved");
  const criticalIssues = openIssues.filter((i: any) => i.severity === "critical").length;
  const canRelease = criticalIssues === 0 && overallScore >= 80;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Overall Readiness</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overallScore}%</p>
            <Progress value={overallScore} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Categories Ready</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{readyCount}/{readiness.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Open Issues</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{openIssues.length}</p>
            {criticalIssues > 0 && <p className="text-xs text-red-600 mt-1">{criticalIssues} critical</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Release Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={canRelease ? "default" : "destructive"}>
              {canRelease ? "READY" : "BLOCKED"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Run Full Validation</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Executes health checks across every Founder Office module and integration.
            </p>
          </div>
          <Button
            onClick={() => runValidation.mutate("full")}
            disabled={runValidation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {runValidation.isPending ? "Running..." : "Run Validation"}
          </Button>
        </CardHeader>
        {latestRun && (
          <CardContent>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {latestRun.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                   latestRun.status === "failed" ? <XCircle className="h-4 w-4 text-red-600" /> :
                   <Clock className="h-4 w-4 text-blue-600" />}
                  <span className="font-medium">Last run: {latestRun.run_type}</span>
                  <Badge variant="outline" className={statusColor(latestRun.status)}>{latestRun.status}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(latestRun.started_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">{latestRun.passed_checks} passed</span>
                <span className="text-amber-600">{latestRun.warning_checks} warnings</span>
                <span className="text-red-600">{latestRun.failed_checks} failed</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>Readiness Categories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {readiness.map((r: any) => (
            <div key={r.category} className="flex items-center gap-4 rounded-lg border p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{r.category}</span>
                  <Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge>
                </div>
                {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
              </div>
              <div className="w-32">
                <Progress value={r.score} />
                <p className="text-xs text-right text-muted-foreground mt-1">{r.score}%</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {openIssues.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Open Issues</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {openIssues.slice(0, 5).map((i: any) => (
              <div key={i.id} className="flex items-center justify-between text-sm border rounded p-2">
                <span>{i.title}</span>
                <div className="flex gap-2">
                  <Badge variant="outline">{i.module}</Badge>
                  <Badge variant={i.severity === "critical" ? "destructive" : "secondary"}>{i.severity}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductionOverview;
