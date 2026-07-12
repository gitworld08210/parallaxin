import { useContinuityPlans, useSaveContinuityPlan } from "@/hooks/admin-os/useCommandCenter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const useDepartments = () =>
  useQuery({
    queryKey: ["admin-departments-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_departments").select("id,name");
      if (error) throw error;
      return data ?? [];
    },
  });

const ContinuityCenter = () => {
  const { data: plans } = useContinuityPlans();
  const { data: depts } = useDepartments();
  const save = useSaveContinuityPlan();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    name: "",
    summary: "",
    content: "",
    status: "draft",
    department_id: null,
    contacts: [],
    dependencies: [],
    checklist: [],
  });

  const submit = async () => {
    if (!form.name) return toast.error("Name required");
    await save.mutateAsync(form);
    toast.success("Plan saved");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Maintain business continuity, recovery procedures, and emergency contacts.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New continuity plan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
                <div>
                  <Label>Department</Label>
                  <Select value={form.department_id ?? ""} onValueChange={(v) => setForm({...form, department_id: v || null})}>
                    <SelectTrigger><SelectValue placeholder="Company-wide" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Company-wide</SelectItem>
                      {(depts ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Summary</Label><Input value={form.summary} onChange={(e) => setForm({...form, summary: e.target.value})} /></div>
              <div><Label>Content</Label><Textarea rows={5} value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(plans ?? []).map((p: any) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{p.name}</p>
                  <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {p.department?.name ?? "Company-wide"} · updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
                {p.summary && <p className="text-sm mt-2">{p.summary}</p>}
              </div>
            </div>
          </Card>
        ))}
        {!plans?.length && <Card className="p-8 text-center text-sm text-muted-foreground">No continuity plans yet.</Card>}
      </div>
    </div>
  );
};

export default ContinuityCenter;
