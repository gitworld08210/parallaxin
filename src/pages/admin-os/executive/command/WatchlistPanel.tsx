import { useWatchlists, useSaveWatchlist, useAddWatchlistItem, useDeleteWatchlistItem } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const itemTypes = ["project","department","kpi","risk","approval","decision","incident","employee","custom"];
const priorities = ["low","medium","high","critical"];

const WatchlistPanel = () => {
  const { data: lists } = useWatchlists();
  const saveList = useSaveWatchlist();
  const addItem = useAddWatchlistItem();
  const delItem = useDeleteWatchlistItem();
  const [openList, setOpenList] = useState(false);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [listForm, setListForm] = useState<any>({ name: "", description: "" });
  const [itemForm, setItemForm] = useState<any>({ item_type: "project", label: "", priority: "medium", note: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track critical projects, risks, KPIs, approvals and business signals.</p>
        <Dialog open={openList} onOpenChange={setOpenList}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New watchlist</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New watchlist</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={listForm.name} onChange={(e) => setListForm({...listForm, name: e.target.value})} /></div>
              <div><Label>Description</Label><Textarea value={listForm.description} onChange={(e) => setListForm({...listForm, description: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button onClick={async () => {
                if (!listForm.name) return toast.error("Name required");
                await saveList.mutateAsync(listForm);
                toast.success("Watchlist created");
                setOpenList(false);
                setListForm({ name: "", description: "" });
              }}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(lists ?? []).map((l: any) => (
          <Card key={l.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <p className="font-semibold">{l.name}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddTo(l.id)}><Plus className="h-3 w-3 mr-1" /> Item</Button>
            </div>
            {l.description && <p className="text-xs text-muted-foreground mt-1">{l.description}</p>}
            <div className="mt-3 space-y-2">
              {(l.items ?? []).map((it: any) => (
                <div key={it.id} className="flex items-center justify-between border-b border-border/40 pb-1 text-sm">
                  <div>
                    <p className="font-medium">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.item_type} {it.note ? ` · ${it.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={it.priority === "critical" ? "destructive" : it.priority === "high" ? "secondary" : "outline"}>{it.priority}</Badge>
                    <Button size="icon" variant="ghost" onClick={() => delItem.mutate(it.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              {!l.items?.length && <p className="text-sm text-muted-foreground">No items yet.</p>}
            </div>
          </Card>
        ))}
        {!lists?.length && <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">No watchlists yet.</Card>}
      </div>

      <Dialog open={!!addTo} onOpenChange={(v) => !v && setAddTo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add watchlist item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={itemForm.item_type} onValueChange={(v) => setItemForm({...itemForm, item_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{itemTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={itemForm.priority} onValueChange={(v) => setItemForm({...itemForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{priorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Label</Label><Input value={itemForm.label} onChange={(e) => setItemForm({...itemForm, label: e.target.value})} /></div>
            <div><Label>Reference (optional)</Label><Input value={itemForm.item_ref ?? ""} onChange={(e) => setItemForm({...itemForm, item_ref: e.target.value})} /></div>
            <div><Label>Note</Label><Textarea value={itemForm.note} onChange={(e) => setItemForm({...itemForm, note: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
              if (!itemForm.label) return toast.error("Label required");
              await addItem.mutateAsync({ ...itemForm, watchlist_id: addTo });
              toast.success("Added");
              setAddTo(null);
              setItemForm({ item_type: "project", label: "", priority: "medium", note: "" });
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WatchlistPanel;
