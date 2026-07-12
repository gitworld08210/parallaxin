import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useComplianceRecords, useSecurityPolicies } from "@/hooks/admin-os/useSecurity";

const ComplianceDashboard = () => {
  const { data: policies = [] } = useSecurityPolicies();
  const { data: records = [] } = useComplianceRecords();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Security Policies</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {policies.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.code} · v{p.version} · {p.category}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{p.status}</span>
            </div>
          ))}
          {policies.length === 0 && <p className="text-sm text-muted-foreground">No policies registered.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Compliance Checks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">{r.policy_code}</p>
                <p className="text-xs text-muted-foreground">{r.subject_type} · {new Date(r.checked_at).toLocaleDateString()}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${r.status === "compliant" ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>{r.status}</span>
            </div>
          ))}
          {records.length === 0 && <p className="text-sm text-muted-foreground">No compliance checks yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceDashboard;
