import { useParams, Link } from "react-router-dom";
import { useKipCollection, useKipDocuments, useUploadDocument, useReindexDocument, useDeleteDocument } from "@/hooks/admin-os/useKip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useState } from "react";
import { Upload, RefreshCw, Trash2, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  indexed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  indexing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pending: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground",
};

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: collection } = useKipCollection(id);
  const { data: documents = [], refetch } = useKipDocuments(id);
  const uploadMut = useUploadDocument();
  const reindexMut = useReindexDocument();
  const deleteMut = useDeleteDocument();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; description: string; document_type: string; file: File | null; raw_text: string }>({
    title: "", description: "", document_type: "general", file: null, raw_text: "",
  });

  const submit = async () => {
    if (!id) return;
    if (!form.title.trim()) return toast.error("Title required");
    if (!form.file && !form.raw_text.trim()) return toast.error("Provide a file or paste text");
    try {
      await uploadMut.mutateAsync({
        collection_id: id,
        title: form.title,
        description: form.description || undefined,
        document_type: form.document_type,
        file: form.file ?? undefined,
        raw_text: form.raw_text || undefined,
      });
      toast.success("Uploaded — indexing in background");
      setOpen(false);
      setForm({ title: "", description: "", document_type: "general", file: null, raw_text: "" });
      setTimeout(() => refetch(), 4000);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  if (!collection) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Collection</p>
          <h2 className="text-xl font-bold">{collection.name}</h2>
          <p className="text-sm text-muted-foreground">{collection.description ?? "—"}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin-os/executive/knowledge/chat?collection=${collection.id}`}>
              <MessageSquare className="h-4 w-4 mr-1" /> Ask AI
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Upload className="h-4 w-4 mr-1" /> Upload Document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["policy","sop","handbook","minutes","decision","audit","report","technical","general"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <label className="text-xs text-muted-foreground">File (PDF, DOCX, TXT, MD)</label>
                  <Input type="file" accept=".pdf,.docx,.pptx,.txt,.md,.json,.csv" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Or paste raw text</label>
                  <Textarea rows={4} placeholder="Paste content..." value={form.raw_text} onChange={(e) => setForm({ ...form, raw_text: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={uploadMut.isPending}>Upload & Index</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Documents ({documents.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No documents. Upload one to start building your knowledge base.</p>
          ) : (
            documents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-md border border-border/60 p-3 hover:border-primary/40">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.document_type} · v{d.current_version} · {d.chunk_count} chunks{d.indexing_error ? ` · ${d.indexing_error}` : ""}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusColor[d.status] ?? ""}`}>{d.status}</Badge>
                <Button size="sm" variant="ghost" onClick={() => reindexMut.mutate(d.id)} title="Re-index">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete document?")) deleteMut.mutate(d.id); }} title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
