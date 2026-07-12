import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useTsAppeals } from "@/hooks/admin-os/useTrustSafety";
import { format } from "date-fns";

const AppealsCenter = () => {
  const { data: appeals = [] } = useTsAppeals();
  const pending = appeals.filter((a: any) => a.status !== "decided");
  const decided = appeals.filter((a: any) => a.status === "decided");

  const List = ({ items }: { items: any[] }) => (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
      {items.map((a: any) => (
        <Link key={a.id} to={`/admin-os/trust-safety/cases/${a.case_id}`}
          className="block border rounded p-3 hover:bg-muted/40 transition">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{a.status}</Badge>
            {a.decision && <Badge>{a.decision}</Badge>}
            <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), "PPp")}</span>
          </div>
          <p className="text-sm mt-1 line-clamp-2">{a.reason}</p>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Pending Appeals ({pending.length})</CardTitle></CardHeader>
        <CardContent><List items={pending} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Decided ({decided.length})</CardTitle></CardHeader>
        <CardContent><List items={decided} /></CardContent>
      </Card>
    </div>
  );
};

export default AppealsCenter;
