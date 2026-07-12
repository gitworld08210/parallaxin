import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useValidationRuns } from "@/hooks/admin-os/useProductionReadiness";
import { format } from "date-fns";

const ValidationHistoryPage = () => {
  const { data: runs = [] } = useValidationRuns();
  return (
    <Card>
      <CardHeader><CardTitle>Validation History</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Passed</TableHead>
              <TableHead>Warnings</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No runs.</TableCell></TableRow>}
            {runs.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{format(new Date(r.started_at), "PPp")}</TableCell>
                <TableCell>{r.run_type}</TableCell>
                <TableCell><Badge variant={r.status === "passed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-green-600">{r.passed_checks}</TableCell>
                <TableCell className="text-amber-600">{r.warning_checks}</TableCell>
                <TableCell className="text-red-600">{r.failed_checks}</TableCell>
                <TableCell>{r.total_checks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ValidationHistoryPage;
