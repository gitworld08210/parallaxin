import { useAnnouncements, useSaveAnnouncement, usePublishAnnouncement, useArchiveAnnouncement } from "@/hooks/admin-os/useCommandCenter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Archive, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const types = ["company","department","executive","holiday","maintenance","security","policy"];
const audiences = ["company","department","role","level","employees"];

const AnnouncementCenter = () => {
  const { data: rows } = useAnnouncements();
  const save = useSaveAnnouncement();
  const pub = usePublishAnnouncement();
  const arch = useArchiveAnnouncement();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    type: "company",
    title: "",
    body: "",
    audience_type: "company",
    status: "draft",
    pinned: false,
  });

  const submit = async () => {
    if (!form.title) return toast.error("Title required");
    await save.mutateAsync(form);
    toast.success("Announcement saved");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Publish company-wide announcements, holiday, security and policy notices.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New announcement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Audience</Label>
                  <Select value={form.audience_type} onValueChange={(v) => setForm({...form, audience_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{audiences.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              <div><Label>Body</Label><Textarea rows={6} value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Publish at</Label><Input type="datetime-local" value={form.publish_at ?? ""} onChange={(e) => setForm({...form, publish_at: e.target.value})} /></div>
                <div><Label>Expires</Label><Input type="datetime-local" value={form.expires_at ?? ""} onChange={(e) => setForm({...form, expires_at: e.target.value})} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.pinned} onCheckedChange={(v) => setForm({...form, pinned: v})} />
                <span className="text-sm">Pin to top</span>
              </div>
            </div>
            <DialogFooter><Button onClick={submit} disabled={save.isPending}>Save draft</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {(rows ?? []).map((a: any) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{a.type}</Badge>
                  <Badge variant={a.status === "published" ? "default" : "outline"}>{a.status}</Badge>
                  {a.pinned && <Badge variant="destructive">Pinned</Badge>}
                  <p className="font-medium">{a.title}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Audience: {a.audience_type} · Created {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {a.status !== "published" && a.status !== "archived" && (
                  <Button size="sm" variant="outline" onClick={async () => { await pub.mutateAsync(a.id); toast.success("Published"); }}>
                    <Send className="h-3 w-3 mr-1" /> Publish
                  </Button>
                )}
                {a.status !== "archived" && (
                  <Button size="icon" variant="ghost" onClick={() => arch.mutate(a.id)}><Archive className="h-4 w-4" /></Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {!rows?.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No announcements yet.</Card>
        )}
      </div>
    </div>
  );
};

export default AnnouncementCenter;
