import { useState } from "react";
import { Link } from "react-router-dom";
import { useTickets, useCreateTicket, type SupStatus, type SupPriority, type SupCategory } from "@/hooks/admin-os/useSupport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const statuses: (SupStatus | "all")[] = ["all", "open", "assigned", "in_progress", "waiting_customer", "waiting_internal", "escalated", "resolved", "closed"];
const priorities: SupPriority[] = ["critical", "high", "medium", "low"];
const categories: SupCategory[] = ["account", "verification", "trust_safety", "technical", "billing", "creator", "organization", "bug", "feature_request", "appeal", "it", "hr", "other"];

const priorityTone: Record<SupPriority, string> = {
  critical: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground",
};

const TicketQueue = () => {
  const [status, setStatus] = useState<SupStatus | "all">("all");
  const [priority, setPriority] = useState<SupPriority | "all">("all");
  const { data: tickets = [] } = useTickets({
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
  });
  const create = useCreateTicket();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ subject: string; description: string; category: SupCategory; priority: SupPriority }>({
    subject: "", description: "", category: "other", priority: "medium",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SupStatus | "all")}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as SupPriority | "all")}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />New ticket</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as SupCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as SupPriority }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!form.subject || create.isPending}
                onClick={() => create.mutate(form, { onSuccess: () => { setOpen(false); setForm({ subject: "", description: "", category: "other", priority: "medium" }); } })}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0 divide-y">
        {tickets.length === 0 && <div className="p-6 text-sm text-muted-foreground">No tickets.</div>}
        {tickets.map(t => (
          <Link key={t.id} to={`/admin-os/support/tickets/${t.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40">
            <div className="min-w-0">
              <div className="font-medium truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground truncate">{t.ticket_number} · {t.category} · {t.source}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={priorityTone[t.priority as SupPriority]}>{t.priority}</Badge>
              <Badge variant="outline">{t.status}</Badge>
            </div>
          </Link>
        ))}
      </CardContent></Card>
    </div>
  );
};

export default TicketQueue;
