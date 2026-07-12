import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { searchKnowledge } from "@/hooks/admin-os/useExecutiveAi";

const KnowledgeSearchPage = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      setResults(await searchKnowledge(query.trim()));
    } finally {
      setBusy(false);
    }
  };

  const section = (title: string, items: any[], render: (i: any) => any) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">{title} <Badge variant="outline">{items.length}</Badge></CardTitle></CardHeader>
      <CardContent className="text-sm space-y-1.5">
        {items.length === 0 ? <p className="text-xs text-muted-foreground">No matches.</p> : items.map(render)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Search policies, decisions, reports, configurations..." />
            <Button onClick={run} disabled={busy || !query.trim()}><Search className="h-4 w-4 mr-1" /> Search</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Results respect your permissions. Restricted records are excluded.</p>
        </CardContent>
      </Card>

      {results && (
        <div className="grid md:grid-cols-2 gap-3">
          {section("Policies", results.policies, (r: any) => (
            <div key={r.id} className="px-3 py-2 rounded bg-muted/30">
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.category} · {r.summary?.slice(0, 100)}</p>
            </div>
          ))}
          {section("Strategic Decisions", results.decisions, (r: any) => (
            <div key={r.id} className="px-3 py-2 rounded bg-muted/30">
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.status} · {r.summary?.slice(0, 100)}</p>
            </div>
          ))}
          {section("Department Reports", results.reports, (r: any) => (
            <div key={r.id} className="px-3 py-2 rounded bg-muted/30">
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.cadence}</p>
            </div>
          ))}
          {section("Configurations", results.configurations, (r: any) => (
            <div key={r.id} className="px-3 py-2 rounded bg-muted/30">
              <p className="font-medium">{r.category} · {r.key}</p>
              <p className="text-xs text-muted-foreground">{r.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeSearchPage;
