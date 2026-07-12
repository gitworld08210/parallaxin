/**
 * Phase 3.4 — Policy Center: list, filter, create policies.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, SectionCard, StatusBadge, EmptyState } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Plus, Search } from "lucide-react";
import { usePolicies, useCreatePolicy, type PolicyStatus } from "@/hooks/admin-os/useGovernance";
import { toast } from "sonner";

const CATEGORIES = ["HR", "Security", "Finance", "Technology", "Creator", "Verification", "Compliance", "Support", "Other"];

const STATUS_TONE: Record<PolicyStatus, "info" | "warning" | "success" | "danger" | "neutral"> = {
  draft: "neutral",
  review: "warning",
  approved: "info",
  published: "success",
  revision: "warning",
  archived: "neutral",
};

const NewPolicyDialog = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", title: "", category: "HR", summary: "", content: "",
  });
  const create = useCreatePolicy();

  const submit = async () => {
    if (!form.code || !form.title) return toast.error("Code and title are required");
    try {
      await create.mutateAsync(form);
      toast.success("Policy draft created");
      setOpen(false);
      setForm({ code: "", title: "", category: "HR", summary: "", content: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create policy");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New policy</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New policy (draft)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="HR-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Initial content (v1)</Label>
            <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>Create draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PolicyCenter = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PolicyStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const { data: policies = [], isLoading } = usePolicies({
    status, category: category === "all" ? undefined : category, search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="GOVERNANCE · POLICIES"
        title="Policy Center"
        description="Draft, review, approve, publish, revise and archive company policies."
        actions={<NewPolicyDialog />}
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title, code, summary…" className="pl-8"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(["draft","review","approved","published","revision","archived"] as PolicyStatus[]).map((s) =>
                <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard padded={false}>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : policies.length === 0 ? (
          <EmptyState icon={FileText} title="No policies yet" description="Create your first policy to get started." />
        ) : (
          <div className="divide-y divide-border/60">
            {policies.map((p) => (
              <Link key={p.id} to={`/admin-os/executive/governance/policies/${p.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-[11px] text-muted-foreground">{p.code}</p>
                    <p className="font-medium text-sm truncate">{p.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.summary ?? "—"}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">v{p.current_version}</span>
                <span className="text-[11px] text-muted-foreground w-24 truncate">{p.category}</span>
                <StatusBadge tone={STATUS_TONE[p.status]} label={p.status} />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default PolicyCenter;
