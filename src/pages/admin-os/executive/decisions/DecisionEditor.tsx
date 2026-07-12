/**
 * Phase 3.5 — New Strategic Decision editor.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, SectionCard } from "@/components/admin-os/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateDecision } from "@/hooks/admin-os/useStrategicDecisions";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Company Strategy","HR","Finance","Technology","Security","Product",
  "Operations","Legal","Compliance","Investment","Expansion","Emergency","Support","Other",
];
const PRIORITIES = ["low","medium","high","critical"] as const;

const DecisionEditor = () => {
  const nav = useNavigate();
  const create = useCreateDecision();
  const [f, setF] = useState({
    decision_code: "", title: "", summary: "",
    business_problem: "", objectives: "", alternatives_considered: "",
    risk_assessment: "", expected_benefits: "",
    category: "Company Strategy", priority: "medium" as (typeof PRIORITIES)[number],
    effective_date: "", review_date: "",
  });

  const submit = async () => {
    if (!f.decision_code || !f.title) return toast.error("Code and title are required");
    try {
      const created = await create.mutateAsync({
        ...f,
        effective_date: f.effective_date || null,
        review_date: f.review_date || null,
      } as any);
      toast.success("Decision drafted (v1)");
      nav(`/admin-os/executive/decisions/${created.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create decision");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin-os/executive/decisions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3 w-3" /> Back to Decision Center
        </Link>
      </div>

      <PageHeader
        eyebrow="DECISIONS · NEW"
        title="Draft a strategic decision"
        description="Fill in the essentials. You can refine each section — every change creates a new version."
        actions={<Button onClick={submit} disabled={create.isPending}>Create v1</Button>}
      />

      <SectionCard title="Identification">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Decision code</Label>
            <Input value={f.decision_code}
              onChange={(e) => setF({ ...f, decision_code: e.target.value.toUpperCase() })}
              placeholder="STRAT-2026-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Executive summary</Label>
            <Textarea rows={2} value={f.summary}
              onChange={(e) => setF({ ...f, summary: e.target.value })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Decision record">
        <div className="grid md:grid-cols-2 gap-3">
          {([
            ["business_problem","Business problem"],
            ["objectives","Objectives"],
            ["alternatives_considered","Alternatives considered"],
            ["risk_assessment","Risk assessment"],
            ["expected_benefits","Expected benefits"],
          ] as const).map(([k, label]) => (
            <div key={k} className="space-y-1.5 md:col-span-2">
              <Label>{label}</Label>
              <Textarea rows={3} value={(f as any)[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value } as any)} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Dates">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Effective date</Label>
            <Input type="date" value={f.effective_date}
              onChange={(e) => setF({ ...f, effective_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Review date</Label>
            <Input type="date" value={f.review_date}
              onChange={(e) => setF({ ...f, review_date: e.target.value })} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default DecisionEditor;
