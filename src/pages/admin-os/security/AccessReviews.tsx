import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useAccessReviews, useCreateAccessReview } from "@/hooks/admin-os/useSecurity";

const AccessReviews = () => {
  const { data: reviews = [] } = useAccessReviews();
  const create = useCreateAccessReview();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", scope: "department", due_date: "" });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />New review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Access Review Cycle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Scope (department/role)" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={async () => { await create.mutateAsync(form); setOpen(false); }}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Access Reviews</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border/60 p-3 text-sm">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">Scope: {r.scope} · Due {r.due_date ?? "—"}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{r.status}</span>
            </div>
          ))}
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews scheduled.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessReviews;
