import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useValidationRuns, useRunIntegrations } from "@/hooks/admin-os/useProductionReadiness";

const IntegrationsPage = () => {
  const { data: runs = [] } = useValidationRuns();
  const latestRun = runs[0];
  const { data: integrations = [] } = useRunIntegrations(latestRun?.id);

  return (
    <Card>
      <CardHeader><CardTitle>Integration Status</CardTitle></CardHeader>
      <CardContent>
        {integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Run a validation to see integration health.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Integration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.source_module}</TableCell>
                  <TableCell>{i.target_module}</TableCell>
                  <TableCell className="text-muted-foreground">{i.integration_name}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === "operational" ? "default" : "destructive"}>{i.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {i.latency_ms ? `${i.latency_ms}ms` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default IntegrationsPage;
