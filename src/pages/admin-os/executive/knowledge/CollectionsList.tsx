import { useState } from "react";
import { useKipCollections, useCreateCollection } from "@/hooks/admin-os/useKip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";

export default function CollectionsList() {
  const { data: collections = [], isLoading } = useKipCollections();
  const createMut = useCreateCollection();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", department: "founder_office", visibility: "private" as "private" | "shared" | "company" });

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    try {
      await createMut.mutateAsync(form as any);
      toast.success("Collection created");
      setOpen(false);
      setForm({ name: "", description: "", department: "founder_office", visibility: "private" });
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Knowledge Collections</h2>
          <p className="text-xs text-muted-foreground">Each collection has independent permissions and can host AI conversations.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Collection</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Collection</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  {["founder_office","hr","finance","security","engineering","support","verification","legal","compliance"].map((d) => (
                    <SelectItem key={d} value={d}>{d.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.visibility} onValueChange={(v: any) => setForm({ ...form, visibility: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared with members</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : collections.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No collections. Create your first one to upload knowledge.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} to={`/admin-os/executive/knowledge/collections/${c.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Layers className="h-4 w-4 text-primary" />
                    <Badge variant="outline" className="text-[10px]">{c.visibility}</Badge>
                  </div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{c.description ?? "—"}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                    <span>{c.department ?? "shared"}</span>
                    <span>{c.document_count} docs</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
