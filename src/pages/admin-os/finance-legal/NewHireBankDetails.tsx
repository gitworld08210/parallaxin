import { useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Download, Loader2, ShieldCheck } from "lucide-react";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { ADMIN_PERMISSIONS } from "@/features/admin-os/permissions";
import {
  useAllFinanceOnboarding,
  useVerifyFinanceOnboarding,
  signedDocUrl,
  type HireOnboardingStatus,
} from "@/hooks/admin-os/useHireCompensation";

const statusColor: Record<HireOnboardingStatus, string> = {
  awaiting_employee: "bg-amber-500/10 text-amber-600",
  submitted_by_employee: "bg-sky-500/10 text-sky-600",
  verified_by_finance: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-red-500/10 text-red-600",
};

const NewHireBankDetails = () => {
  const { hasPermission } = useEmployee();
  const canVerify = hasPermission(ADMIN_PERMISSIONS.FINANCE_HIRE_ONBOARDING_VERIFY);
  const { data, isLoading } = useAllFinanceOnboarding();
  const verify = useVerifyFinanceOnboarding();
  const [reason, setReason] = useState("");
  const [reasonId, setReasonId] = useState<string | null>(null);

  if (!canVerify) return <Navigate to="/admin-os/no-access" replace />;

  const openDoc = async (path: string | null) => {
    if (!path) return;
    const url = await signedDocUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Could not generate download link");
  };

  const doVerify = async (id: string) => {
    try {
      await verify.mutateAsync({ id, decision: "verify" });
      toast.success("Verified");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doReject = async (id: string) => {
    if (!reason.trim()) {
      setReasonId(id);
      toast.error("Please add a reason");
      return;
    }
    try {
      await verify.mutateAsync({ id, decision: "reject", reason });
      toast.success("Rejected & sent back");
      setReasonId(null);
      setReason("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            FINANCE · NEW HIRE BANK & KYC
          </p>
          <h1 className="text-xl font-bold">New Hire Bank Details</h1>
          <p className="text-xs text-muted-foreground">
            Employee ne khud upload kiya. Verify karo ya reason ke saath reject karo.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground rounded-xl border border-border/60 border-dashed">
          Abhi koi hire finance onboarding pending nahi.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">
                  {r.bank_account_holder_name ?? "(name pending)"}
                </p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>
                  {r.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Bank</p>
                  <p className="font-medium">{r.bank_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">A/C number</p>
                  <p className="font-mono">{r.account_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IFSC / SWIFT</p>
                  <p className="font-mono">{r.ifsc_swift ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PAN</p>
                  <p className="font-mono">{r.pan_number ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aadhaar (last 4)</p>
                  <p className="font-mono">{r.aadhaar_last4 ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Emergency contact</p>
                  <p>{r.emergency_contact ?? "—"}</p>
                </div>
                {r.address && (
                  <div className="col-span-full">
                    <p className="text-muted-foreground">Address</p>
                    <p>{r.address}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["cancelled_cheque_path", "Cheque"],
                    ["pan_doc_path", "PAN"],
                    ["aadhaar_doc_path", "Aadhaar"],
                    ["address_proof_path", "Address"],
                  ] as const
                ).map(([k, label]) => {
                  const p = r[k as keyof typeof r] as string | null;
                  return p ? (
                    <button
                      key={k}
                      onClick={() => openDoc(p)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
                    >
                      <Download className="h-3 w-3" /> {label}
                    </button>
                  ) : null;
                })}
              </div>

              {r.rejection_reason && (
                <p className="text-[11px] text-red-600">Last rejection: {r.rejection_reason}</p>
              )}

              {r.status !== "verified_by_finance" && (
                <>
                  {reasonId === r.id && (
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Rejection reason"
                      className="w-full text-xs px-2 py-1.5 rounded-md bg-background border border-border/60"
                    />
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => doVerify(r.id)}
                      disabled={verify.isPending || r.status === "awaiting_employee"}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Verify
                    </button>
                    <button
                      onClick={() => {
                        if (reasonId !== r.id) {
                          setReasonId(r.id);
                          setReason("");
                          return;
                        }
                        doReject(r.id);
                      }}
                      disabled={verify.isPending}
                      className="inline-flex items-center gap-1 rounded-md bg-red-500/10 text-red-600 px-2 py-1 text-[11px] font-semibold hover:bg-red-500/20"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewHireBankDetails;
