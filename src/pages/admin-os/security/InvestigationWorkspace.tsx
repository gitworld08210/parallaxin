import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCreateInvestigation, useInvestigations } from "@/hooks/admin-os/useSecurity";

const InvestigationWorkspace = () => {
  const { data: items = [] } = useInvestigations();
  const create = useCreateInvestigation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", incident_id: "" });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Open investigation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Investigation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="Linked incident id (optional)" value={form.incident_id} onChange={(e) => setForm({ ...form, incident_id: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={async () => {
                await create.mutateAsync({ title: form.title, incident_id: form.incident_id || undefined });
                setOpen(false);
              }}>Open</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Investigations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="rounded-md border border-border/60 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{i.title}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{i.status}</span>
              </div>
              {i.actions_taken && <p className="mt-1 text-xs text-muted-foreground">Actions: {i.actions_taken}</p>}
              {i.lessons_learned && <p className="mt-1 text-xs text-muted-foreground">Lessons: {i.lessons_learned}</p>}
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No investigations yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestigationWorkspace;
