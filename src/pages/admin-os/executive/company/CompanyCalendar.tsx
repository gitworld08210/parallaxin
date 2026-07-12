import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useCalendarEvents, useUpsertCalendarEvent, useDeleteCalendarEvent } from "@/hooks/admin-os/useCompanyConfig";

const EVENT_TYPES = [
  { v: "holiday", l: "Holiday" },
  { v: "working_day", l: "Working Day Override" },
  { v: "global_event", l: "Global Event" },
  { v: "review", l: "Review Calendar" },
  { v: "financial", l: "Financial Calendar" },
  { v: "executive", l: "Executive Calendar" },
];

const CompanyCalendar = () => {
  const { data: events = [] } = useCalendarEvents();
  const upsert = useUpsertCalendarEvent();
  const del = useDeleteCalendarEvent();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    title: "", event_type: "holiday", description: "", starts_at: "", ends_at: "",
    is_recurring: false, recurrence_pattern: "", is_working_day: null,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", event_type: "holiday", description: "", starts_at: "", ends_at: "", is_recurring: false, recurrence_pattern: "", is_working_day: null });
    setOpen(true);
  };
  const openEdit = (e: any) => { setEditing(e); setForm({ ...e, ends_at: e.ends_at ?? "" }); setOpen(true); };
  const submit = async () => {
    const payload: any = { ...form };
    if (!payload.ends_at) delete payload.ends_at;
    await upsert.mutateAsync(editing ? { ...payload, id: editing.id } : payload);
    setOpen(false);
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Company Calendar</h2>
          <p className="text-xs text-muted-foreground mt-1">Working days, holidays, reviews and executive calendars.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Event</Button>
      </div>

      <div className="space-y-2">
        {events.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No calendar events.
          </div>
        )}
        {events.map((e: any) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{e.title}</p>
                  <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
                  {e.is_recurring && <Badge variant="secondary" className="text-[10px]">Recurring</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {e.starts_at}{e.ends_at ? ` → ${e.ends_at}` : ""}
                </p>
                {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Calendar Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start Date</Label><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">End Date (optional)</Label><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div className="flex items-center justify-between"><Label className="text-xs">Recurring</Label><Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} /></div>
            {form.is_recurring && (
              <div><Label className="text-xs">Recurrence Pattern</Label><Input value={form.recurrence_pattern ?? ""} onChange={(e) => setForm({ ...form, recurrence_pattern: e.target.value })} className="mt-1" placeholder="e.g. yearly" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CompanyCalendar;
