import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useHireCompProposals,
  useFinanceDecision,
  type HireCompStatus,
} from "@/hooks/admin-os/useHireCompensation";

const statusColor: Record<HireCompStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_finance_l1: "bg-amber-500/10 text-amber-600",
  pending_finance_l2: "bg-sky-500/10 text-sky-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
  sent_back: "bg-orange-500/10 text-orange-600",
};

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: ccy || "INR", maximumFractionDigits: 0 }).format(n || 0);

const HireApprovals = () => {
  const { hasPermission } = useEmployee();
  const canL1 = hasPermission(ADMIN_PERMISSIONS.FINANCE_HIRE_COMP_REVIEW_L1);
  const canL2 = hasPermission(ADMIN_PERMISSIONS.FINANCE_HIRE_COMP_APPROVE_L2);
  const [tab, setTab] = useState<"l1" | "l2" | "closed">(canL1 ? "l1" : "l2");
  const decide = useFinanceDecision();
  const [reasonBoxId, setReasonBoxId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const filter: HireCompStatus =
    tab === "l1" ? "pending_finance_l1" : tab === "l2" ? "pending_finance_l2" : "approved";
  const { data, isLoading } = useHireCompProposals({ status: filter });

  if (!canL1 && !canL2) return <Navigate to="/admin-os/no-access" replace />;

  const act = async (
    id: string,
    level: "l1" | "l2",
    decision: "approve" | "reject" | "send_back",
  ) => {
    if (decision !== "approve" && !reason.trim()) {
      setReasonBoxId(id);
      toast.error("Please add a reason first");
      return;
    }
    try {
      await decide.mutateAsync({ id, level, decision, reason: reason || undefined });
      toast.success(`Marked ${decision}`);
      setReasonBoxId(null);
      setReason("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
          FINANCE · NEW HIRE APPROVALS
        </p>
        <h1 className="text-xl font-bold">Hire Compensation Approvals</h1>
        <p className="text-xs text-muted-foreground mt-1">
          HR se aayi salary proposals. L1 review → L2 final approval.
        </p>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {(canL1 ? (["l1", "l2", "closed"] as const) : (["l2", "closed"] as const)).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md ${
              tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            {t === "l1" ? "L1 Review" : t === "l2" ? "L2 Approval" : "Approved"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Kuch pending nahi.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.map((p) => {
              const canActL1 = tab === "l1" && canL1;
              const canActL2 = tab === "l2" && canL2;
              return (
                <div key={p.id} className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{p.role_title}</p>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {p.proposal_number}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>
                      {p.status}
                    </span>
                    {p.level && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-border">
                        {p.level}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Base monthly</p>
                      <p className="font-semibold">{fmt(Number(p.base_monthly), p.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Joining bonus</p>
                      <p className="font-semibold">{fmt(Number(p.joining_bonus), p.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Variable</p>
                      <p className="font-semibold">{fmt(Number(p.variable_bonus), p.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Annual CTC</p>
                      <p className="font-semibold">
                        {fmt(
                          Number(p.base_monthly) * 12 +
                            Number(p.joining_bonus) +
                            Number(p.variable_bonus),
                          p.currency,
                        )}
                      </p>
                    </div>
                  </div>
                  {p.notes && <p className="text-[11px] text-muted-foreground">{p.notes}</p>}
                  {p.l1_reason && (
                    <p className="text-[11px] text-orange-600">L1 note: {p.l1_reason}</p>
                  )}
                  {p.l2_reason && (
                    <p className="text-[11px] text-orange-600">L2 note: {p.l2_reason}</p>
                  )}

                  {(canActL1 || canActL2) && (
                    <>
                      {reasonBoxId === p.id && (
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          rows={2}
                          placeholder="Reason (mandatory for reject / send back)"
                          className="w-full text-xs px-2 py-1.5 rounded-md bg-background border border-border/60"
                        />
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => act(p.id, canActL1 ? "l1" : "l2", "approve")}
                          disabled={decide.isPending}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            if (reasonBoxId !== p.id) {
                              setReasonBoxId(p.id);
                              setReason("");
                              return;
                            }
                            act(p.id, canActL1 ? "l1" : "l2", "send_back");
                          }}
                          disabled={decide.isPending}
                          className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 text-orange-600 px-2 py-1 text-[11px] font-semibold hover:bg-orange-500/20"
                        >
                          <RotateCcw className="h-3 w-3" /> Send back
                        </button>
                        <button
                          onClick={() => {
                            if (reasonBoxId !== p.id) {
                              setReasonBoxId(p.id);
                              setReason("");
                              return;
                            }
                            act(p.id, canActL1 ? "l1" : "l2", "reject");
                          }}
                          disabled={decide.isPending}
                          className="inline-flex items-center gap-1 rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-[11px] font-semibold hover:bg-red-500/20"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HireApprovals;
