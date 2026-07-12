import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKipCollections, useKipDocuments, useKipConversations } from "@/hooks/admin-os/useKip";
import { Files, Layers, MessageSquare, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function KnowledgeHome() {
  const collections = useKipCollections();
  const docs = useKipDocuments();
  const convs = useKipConversations();

  const indexedCount = (docs.data ?? []).filter((d) => d.status === "indexed").length;
  const pendingCount = (docs.data ?? []).filter((d) => d.status === "indexing" || d.status === "pending").length;
  const failedCount = (docs.data ?? []).filter((d) => d.status === "failed").length;

  const stats = [
    { label: "Collections", value: collections.data?.length ?? 0, icon: Layers, to: "/admin-os/executive/knowledge/collections" },
    { label: "Indexed Documents", value: indexedCount, icon: Files, to: "/admin-os/executive/knowledge/library" },
    { label: "Conversations", value: convs.data?.length ?? 0, icon: MessageSquare, to: "/admin-os/executive/knowledge/history" },
    { label: "Governance", value: "RBAC + Audit", icon: ShieldCheck, to: "/admin-os/executive/governance" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Collections</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(collections.data ?? []).slice(0, 5).map((c) => (
              <Link key={c.id} to={`/admin-os/executive/knowledge/collections/${c.id}`} className="flex items-center justify-between rounded-md border border-border/60 p-3 hover:border-primary/40">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.department ?? "Shared"} · {c.document_count} docs</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{c.visibility}</Badge>
              </Link>
            ))}
            {(collections.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No collections yet. Create one to get started.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Indexing Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Indexed</span>
              <span className="font-semibold text-emerald-600">{indexedCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">In progress</span>
              <span className="font-semibold text-amber-600">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Failed</span>
              <span className="font-semibold text-destructive">{failedCount}</span>
            </div>
            <div className="pt-2 text-xs text-muted-foreground">
              Every AI answer is grounded on indexed company knowledge only. Documents pending or failed will not appear in retrieval.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
