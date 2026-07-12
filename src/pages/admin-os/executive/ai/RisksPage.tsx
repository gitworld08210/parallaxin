import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, Shield, FileWarning } from "lucide-react";

const RisksPage = () => {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [overdue, incidents, alerts, escalations] = await Promise.all([
        supabase.from("platform_approval_requests").select("id,title,created_at").eq("status", "pending").lt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()).limit(10),
        supabase.from("executive_incidents").select("id,title,severity,status").eq("status", "open").limit(10),
        supabase.from("executive_security_alerts").select("id,title,severity,acknowledged_at").is("acknowledged_at", null).limit(10),
        supabase.from("executive_automation_escalations").select("id,reason,level,status").eq("status", "open").limit(10),
      ]);
      const items: any[] = [];
      (overdue.data ?? []).forEach((r: any) => items.push({ type: "overdue_approval", icon: Clock, title: r.title, meta: `Pending since ${new Date(r.created_at).toLocaleDateString()}`, severity: "high" }));
      (incidents.data ?? []).forEach((r: any) => items.push({ type: "incident", icon: AlertTriangle, title: r.title, meta: `Severity: ${r.severity}`, severity: r.severity }));
      (alerts.data ?? []).forEach((r: any) => items.push({ type: "security_alert", icon: Shield, title: r.title, meta: `Unacknowledged · ${r.severity}`, severity: r.severity }));
      (escalations.data ?? []).forEach((r: any) => items.push({ type: "escalation", icon: FileWarning, title: r.reason, meta: `Level ${r.level}`, severity: r.level >= 3 ? "high" : "medium" }));
      setRisks(items);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" /> Detected Risks</CardTitle>
          <p className="text-xs text-muted-foreground">Overdue approvals, open incidents, unacknowledged security alerts and open escalations.</p>
        </CardHeader>
      </Card>
      {loading && <p className="text-sm text-muted-foreground">Scanning...</p>}
      {!loading && risks.length === 0 && <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No risks detected right now.</CardContent></Card>}
      {risks.map((r, i) => (
        <Card key={i}>
          <CardContent className="py-3 flex items-center gap-3">
            <r.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.meta}</p>
            </div>
            <Badge variant={r.severity === "high" || r.severity === "critical" ? "destructive" : "outline"}>{r.severity}</Badge>
            <Badge variant="secondary">{r.type}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RisksPage;
