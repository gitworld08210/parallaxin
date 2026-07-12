import { useReportHistory, useLogExport, useReportDefinitions } from "@/hooks/admin-os/useExecutiveReports";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ExportCenter = () => {
  const { data: history } = useReportHistory(50);
  const { data: defs } = useReportDefinitions();
  const logExport = useLogExport();
  const [defId, setDefId] = useState("");
  const [fmt, setFmt] = useState("pdf");

  const trigger = async () => {
    if (!defId) return toast.error("Choose a report");
    await logExport.mutateAsync({ definition_id: defId, format: fmt });
    toast.success(`Export requested (${fmt.toUpperCase()})`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Request an export</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Select value={defId} onValueChange={setDefId}>
              <SelectTrigger><SelectValue placeholder="Choose report…" /></SelectTrigger>
              <SelectContent>{(defs ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Select value={fmt} onValueChange={setFmt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={trigger} disabled={logExport.isPending}>Queue export</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Exports respect RBAC. Only reports you can view can be exported.</p>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Export history</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground text-left">
            <tr className="border-b border-border/60">
              <th className="py-2">Report</th><th>Format</th><th>When</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(history ?? []).map((h: any) => (
              <tr key={h.id} className="border-b border-border/40 last:border-0">
                <td className="py-2">{h.definition?.name ?? "Ad-hoc"}</td>
                <td className="uppercase text-xs">{h.format ?? "—"}</td>
                <td className="text-xs text-muted-foreground">{new Date(h.generated_at).toLocaleString()}</td>
                <td><Badge variant={h.status === "success" ? "default" : "destructive"}>{h.status}</Badge></td>
              </tr>
            ))}
            {!history?.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No exports yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default ExportCenter;
