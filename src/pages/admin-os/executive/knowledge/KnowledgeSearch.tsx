import { useState } from "react";
import { useKipSearch, useKipCollections, type KipSearchResult } from "@/hooks/admin-os/useKip";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search as SearchIcon, FileText } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeSearch() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<string>("all");
  const { data: collections = [] } = useKipCollections();
  const [results, setResults] = useState<KipSearchResult[]>([]);
  const searchMut = useKipSearch();

  const run = async () => {
    if (!q.trim()) return;
    try {
      const r = await searchMut.mutateAsync({ query: q, collectionIds: scope === "all" ? undefined : [scope] });
      setResults(r);
    } catch (e: any) { toast.error(e.message ?? "Search failed"); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Semantic search across authorized knowledge..." value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
          </div>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All collections</SelectItem>
              {collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={searchMut.isPending}>{searchMut.isPending ? "Searching…" : "Search"}</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {results.length === 0 && !searchMut.isPending && (
          <p className="text-sm text-muted-foreground text-center py-6">Enter a natural-language query to search company knowledge.</p>
        )}
        {results.map((r) => (
          <Card key={r.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium truncate">{r.document?.title ?? "Untitled"}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{(r.similarity * 100).toFixed(0)}% match</Badge>
              </div>
              {r.section && <p className="text-[10px] text-muted-foreground">§ {r.section}</p>}
              <p className="text-xs text-muted-foreground line-clamp-3">{r.content}</p>
              {r.document && <p className="text-[10px] text-muted-foreground">{r.document.document_type} · v{r.document.current_version}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
