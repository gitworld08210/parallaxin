import { useKipDocuments, useKipCollections } from "@/hooks/admin-os/useKip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const statusColor: Record<string, string> = {
  indexed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  indexing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pending: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function DocumentLibrary() {
  const { data: docs = [] } = useKipDocuments();
  const { data: collections = [] } = useKipCollections();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const colMap = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);

  const filtered = docs.filter((d) => {
    if (typeFilter !== "all" && d.document_type !== typeFilter) return false;
    if (q && !d.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search documents by title..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {["policy","sop","handbook","minutes","decision","audit","report","technical","general"].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No documents found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <Link key={d.id} to={`/admin-os/executive/knowledge/collections/${d.collection_id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="p-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {colMap.get(d.collection_id)?.name ?? "—"} · {d.document_type} · v{d.current_version} · {d.chunk_count} chunks
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColor[d.status] ?? ""}`}>{d.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
