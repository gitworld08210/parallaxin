/**
 * Phase 3.5 — Strategic Decision search.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin-os/ds";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Gavel, Search } from "lucide-react";
import {
  useDecisions, type DecisionStatus, type DecisionPriority,
} from "@/hooks/admin-os/useStrategicDecisions";

const CATEGORIES = [
  "all","Company Strategy","HR","Finance","Technology","Security","Product",
  "Operations","Legal","Compliance","Investment","Expansion","Emergency","Support","Other",
];

const STATUSES: (DecisionStatus | "all")[] = [
  "all","draft","discussion","review","approved","implementation","monitoring","completed","archived",
];

const PRIORITIES: (DecisionPriority | "all")[] = ["all","low","medium","high","critical"];

const DecisionSearch = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DecisionStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [priority, setPriority] = useState<DecisionPriority | "all">("all");

  const { data: rows = [], isLoading } = useDecisions({
    search: search || undefined,
    status,
    category: category === "all" ? undefined : category,
    priority,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DECISIONS · SEARCH"
        title="Decision Search"
        description="Search every strategic decision — by keyword, code, category, priority or status."
      />

      <SectionCard>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title, code, summary, problem…" className="pl-8"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard title={`${rows.length} result${rows.length === 1 ? "" : "s"}`} padded={false}>
        {isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">No decisions match those filters.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((d) => (
              <Link key={d.id} to={`/admin-os/executive/decisions/${d.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                <Gavel className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{d.decision_code}</span>
                    <span className="font-medium text-sm truncate">{d.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{d.summary ?? "—"}</p>
                </div>
                <span className="text-[11px] text-muted-foreground w-20 truncate">{d.category}</span>
                <StatusBadge tone={d.priority === "critical" ? "danger" : "info"} label={d.priority} />
                <StatusBadge tone="neutral" label={d.status} />
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DecisionSearch;
