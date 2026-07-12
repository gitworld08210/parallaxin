import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTsPolicies } from "@/hooks/admin-os/useTrustSafety";

const PolicyReference = () => {
  const { data: policies = [] } = useTsPolicies();
  return (
    <Card>
      <CardHeader><CardTitle>Platform Policy Reference</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {policies.map((p: any) => (
          <div key={p.code} className="border rounded p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{p.code}</span>
              <span className="font-semibold">{p.title}</span>
              {p.category && <Badge variant="outline">{p.category}</Badge>}
            </div>
            {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PolicyReference;
