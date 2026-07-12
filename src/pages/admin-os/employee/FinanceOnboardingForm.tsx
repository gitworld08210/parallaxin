import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Save, Send, ShieldCheck, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import {
  useMyFinanceOnboarding,
  useUpsertFinanceOnboarding,
  uploadHireFinanceDoc,
  type HireFinanceOnboarding,
} from "@/hooks/admin-os/useHireCompensation";

type FormShape = Pick<
  HireFinanceOnboarding,
  | "bank_account_holder_name"
  | "bank_name"
  | "account_number"
  | "ifsc_swift"
  | "branch"
  | "pan_number"
  | "aadhaar_last4"
  | "tax_id"
  | "address"
  | "emergency_contact"
  | "cancelled_cheque_path"
  | "pan_doc_path"
  | "aadhaar_doc_path"
  | "address_proof_path"
>;

const empty: FormShape = {
  bank_account_holder_name: "",
  bank_name: "",
  account_number: "",
  ifsc_swift: "",
  branch: "",
  pan_number: "",
  aadhaar_last4: "",
  tax_id: "",
  address: "",
  emergency_contact: "",
  cancelled_cheque_path: "",
  pan_doc_path: "",
  aadhaar_doc_path: "",
  address_proof_path: "",
};

const FinanceOnboardingForm = () => {
  const { user } = useAuth();
  const { employee, loading } = useEmployee();
  const { data: onb, isLoading } = useMyFinanceOnboarding(employee?.id);
  const upsert = useUpsertFinanceOnboarding();
  const [form, setForm] = useState<FormShape>(empty);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (onb) {
      setForm({
        bank_account_holder_name: onb.bank_account_holder_name ?? "",
        bank_name: onb.bank_name ?? "",
        account_number: onb.account_number ?? "",
        ifsc_swift: onb.ifsc_swift ?? "",
        branch: onb.branch ?? "",
        pan_number: onb.pan_number ?? "",
        aadhaar_last4: onb.aadhaar_last4 ?? "",
        tax_id: onb.tax_id ?? "",
        address: onb.address ?? "",
        emergency_contact: onb.emergency_contact ?? "",
        cancelled_cheque_path: onb.cancelled_cheque_path ?? "",
        pan_doc_path: onb.pan_doc_path ?? "",
        aadhaar_doc_path: onb.aadhaar_doc_path ?? "",
        address_proof_path: onb.address_proof_path ?? "",
      });
    }
  }, [onb]);

  if (loading || isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!employee) return <Navigate to="/auth" replace />;
  if (!onb) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center rounded-xl border border-border/60 bg-card">
        <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground" />
        <h1 className="text-lg font-bold mt-2">Finance onboarding not ready yet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aapka finance onboarding link tabhi enable hoga jab HR ka salary proposal Finance L2 se
          approve ho jayega.
        </p>
      </div>
    );
  }

  const locked = onb.status === "verified_by_finance";

  const doUpload = async (
    key: "cheque" | "pan" | "aadhaar" | "address",
    field: keyof FormShape,
    file: File | null,
  ) => {
    if (!file || !user || !employee) return;
    setBusy(field);
    try {
      const path = await uploadHireFinanceDoc(user.id, employee.id, key, file);
      setForm((f) => ({ ...f, [field]: path }));
      toast.success("Uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const save = async (submitNow: boolean) => {
    if (!employee) return;
    try {
      await upsert.mutateAsync({
        employee_id: employee.id,
        ...form,
        status: submitNow ? "submitted_by_employee" : onb.status,
        submitted_at: submitNow ? new Date().toISOString() : onb.submitted_at,
      });
      toast.success(submitNow ? "Submitted to Finance" : "Saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const inp = "mt-1 w-full h-9 px-3 rounded-lg bg-background border border-border/60 text-sm";

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      <div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
          NEW HIRE · FINANCE ONBOARDING
        </p>
        <h1 className="text-xl font-bold">Complete your finance details</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Yeh data sirf Finance department dekhegi. HR ya kisi aur department ko access nahi
          hoga. Current status:{" "}
          <span className="font-semibold text-primary">{onb.status}</span>
        </p>
        {onb.rejection_reason && (
          <p className="text-xs text-red-600 mt-1">
            Finance ne wapas bheja: {onb.rejection_reason}
          </p>
        )}
      </div>

      <fieldset disabled={locked} className={locked ? "opacity-60 pointer-events-none" : ""}>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <p className="text-xs font-bold tracking-wider">BANK ACCOUNT</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              Account holder name
              <input
                className={inp}
                value={form.bank_account_holder_name ?? ""}
                onChange={(e) =>
                  setForm({ ...form, bank_account_holder_name: e.target.value })
                }
              />
            </label>
            <label className="block text-xs">
              Bank name
              <input
                className={inp}
                value={form.bank_name ?? ""}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              />
            </label>
            <label className="block text-xs">
              Account number
              <input
                className={inp}
                value={form.account_number ?? ""}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
              />
            </label>
            <label className="block text-xs">
              IFSC / SWIFT
              <input
                className={inp}
                value={form.ifsc_swift ?? ""}
                onChange={(e) => setForm({ ...form, ifsc_swift: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              Branch
              <input
                className={inp}
                value={form.branch ?? ""}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 mt-4">
          <p className="text-xs font-bold tracking-wider">KYC & TAX</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              PAN
              <input
                className={inp}
                value={form.pan_number ?? ""}
                onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
              />
            </label>
            <label className="block text-xs">
              Aadhaar (last 4)
              <input
                maxLength={4}
                className={inp}
                value={form.aadhaar_last4 ?? ""}
                onChange={(e) => setForm({ ...form, aadhaar_last4: e.target.value })}
              />
            </label>
            <label className="block text-xs">
              Tax ID (other country)
              <input
                className={inp}
                value={form.tax_id ?? ""}
                onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              />
            </label>
            <label className="block text-xs">
              Emergency contact
              <input
                className={inp}
                value={form.emergency_contact ?? ""}
                onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
              />
            </label>
            <label className="block text-xs sm:col-span-2">
              Address
              <textarea
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm"
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3 mt-4">
          <p className="text-xs font-bold tracking-wider">DOCUMENTS</p>
          {(
            [
              ["cheque", "cancelled_cheque_path", "Cancelled cheque"],
              ["pan", "pan_doc_path", "PAN card"],
              ["aadhaar", "aadhaar_doc_path", "Aadhaar"],
              ["address", "address_proof_path", "Address proof"],
            ] as const
          ).map(([k, field, label]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <label className="flex-1">
                <span className="text-muted-foreground">{label}</span>
                <div className="mt-1 flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 cursor-pointer rounded-md border border-border px-2 py-1">
                    <Upload className="h-3 w-3" /> {busy === field ? "Uploading…" : "Choose file"}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => doUpload(k, field, e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {form[field] && (
                    <span className="text-[11px] text-emerald-600 truncate max-w-[180px]">
                      uploaded
                    </span>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {!locked && (
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => save(false)}
            disabled={upsert.isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
          >
            <Save className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => save(true)}
            disabled={upsert.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-xs font-semibold"
          >
            <Send className="h-3 w-3" /> Submit to Finance
          </button>
        </div>
      )}
    </div>
  );
};

export default FinanceOnboardingForm;
