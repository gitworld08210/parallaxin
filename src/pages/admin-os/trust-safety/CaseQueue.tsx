import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useTsCases, useCreateCase, TS_CATEGORIES, TS_SEVERITIES, TS_STATUSES,
} from "@/hooks/admin-os/useTrustSafety";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CaseQueue = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: cases = [] } = useTsCases({
    status: statusFilter === "all" ? undefined : statusFilter,
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });
  const create = useCreateCase();
  const [form, setForm] = useState({
    title: "", description: "", category: "spam", severity: "medium",
  });

  const filtered = cases.filter((c: any) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.case_number.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input placeholder="Search title or case #" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TS_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto"><Plus className="h-4 w-4 mr-1" />New Case</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Open a new Trust & Safety case</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description / initial report" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{TS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>{TS_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!form.title || create.isPending}
                onClick={async () => {
                  await create.mutateAsync(form);
                  setForm({ title: "", description: "", category: "spam", severity: "medium" });
                  setOpen(false);
                }}>Create case</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>Cases ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No cases match filters.</p>}
          {filtered.map((c: any) => (
            <Link key={c.id} to={`/admin-os/trust-safety/cases/${c.id}`}
              className="flex items-center justify-between border rounded p-3 hover:bg-muted/40 transition">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{c.case_number}</span>
                  <Badge variant="outline">{c.category}</Badge>
                  <Badge variant={c.severity === "critical" ? "destructive" : "secondary"}>{c.severity}</Badge>
                  <Badge>{c.status}</Badge>
                </div>
                <p className="text-sm font-medium mt-1 truncate">{c.title}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseQueue;
