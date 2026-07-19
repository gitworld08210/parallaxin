import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, X, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Request = {
  id: string;
  module: string;
  entity_type: string;
  entity_id: string;
  title: string;
  status: string;
  priority: string;
  requested_by: string;
  current_step: number;
  due_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
};

type Step = {
  id: string;
  request_id: string;
  step_index: number;
  approver_role: string;
  approver_department: string | null;
  status: string;
};

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  waiting: "bg-muted text-muted-foreground border-border",
};

export default function ApprovalsInbox() {
  const [tab, setTab] = useState<"inbox" | "mine" | "all">("inbox");
  const [requests, setRequests] = useState<Request[]>([]);
  const [steps, setSteps] = useState<Record<string, Step[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Request | null>(null);
  const [reason, setReason] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let q = supabase.from("platform_approval_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (tab === "mine") q = q.eq("requested_by", user?.id ?? "");
    if (tab === "inbox") q = q.eq("status", "pending");
    const { data: reqs } = await q;
    const list = (reqs as Request[]) ?? [];
    setRequests(list);
    if (list.length) {
      const { data: st } = await supabase
        .from("platform_approval_steps")
        .select("*")
        .in("request_id", list.map((r) => r.id));
      const grouped: Record<string, Step[]> = {};
      ((st as Step[]) ?? []).forEach((s) => {
        (grouped[s.request_id] ??= []).push(s);
      });
      Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.step_index - b.step_index));
      setSteps(grouped);
    } else {
      setSteps({});
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setDecidingId(id);
    const { error } = await supabase.rpc("decide_approval_step", {
      p_request_id: id, p_decision: decision, p_reason: reason || null,
    });
    setDecidingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${decision}`);
    setReason(""); setSelected(null);
    load();
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">Unified inbox for hire compensation, employee movements, and expense reimbursements.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["inbox", "mine", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize transition ${
              tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "inbox" ? "Pending" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nothing here.</Card>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => {
            const overdue = r.due_at && new Date(r.due_at) < new Date() && r.status === "pending";
            const isOpen = selected?.id === r.id;
            return (
              <Card key={r.id} className="overflow-hidden">
                <button
                  onClick={() => setSelected(isOpen ? null : r)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/40 transition"
                >
                  <Badge className={`border capitalize ${statusColor[r.status] ?? statusColor.waiting}`}>{r.status}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="capitalize">{r.entity_type.replace(/_/g, " ")}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                      {r.priority !== "normal" && <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>}
                      {overdue && <span className="text-red-400 flex items-center gap-1"><Clock className="h-3 w-3" />SLA breached</span>}
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-border p-3 space-y-3 bg-background/40">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(steps[r.id] ?? []).map((s, i) => (
                        <div key={s.id} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <Badge className={`border ${statusColor[s.status] ?? statusColor.waiting}`}>
                            {s.approver_role}
                            {s.approver_department ? ` · ${s.approver_department}` : ""}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Payload</summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    </details>
                    {r.status === "pending" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Optional reason / notes"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => decide(r.id, "approved")}
                            disabled={decidingId === r.id}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            {decidingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => decide(r.id, "rejected")}
                            disabled={decidingId === r.id}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
