import { useState } from "react";
import { CheckCircle2, Copy, Download, Eye, EyeOff, Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { AppointResult } from "@/hooks/admin-os/useAppointments";

interface Props {
  result: AppointResult;
  slotLabel: string;
  personalEmail: string;
  onClose: () => void;
}

export const AppointmentResultDialog = ({ result, slotLabel, personalEmail, onClose }: Props) => {
  const [reveal, setReveal] = useState(false);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-b border-border/60 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-emerald-600">
                APPOINTMENT COMPLETE
              </p>
              <h2 className="text-lg font-bold">{slotLabel} appointed</h2>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {result.email_sent ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
              <Mail className="h-4 w-4 mt-0.5 text-emerald-600" />
              <div className="text-xs">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Joining letter emailed
                </p>
                <p className="text-muted-foreground mt-0.5">
                  PDF sent to <span className="font-mono">{personalEmail}</span> from your Gmail.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
              <div className="text-xs">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Email not sent
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {result.email_error ?? "Gmail connector unavailable."} Download and share the
                  PDF manually.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Employee ID" value={result.employee_number} onCopy={copy} />
            <FieldRow label="Company Email" value={result.company_email} onCopy={copy} />
          </div>

          <div className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold tracking-[0.2em] text-amber-600">
                CONFIDENTIAL — SHOWN ONCE
              </p>
              <button
                onClick={() => setReveal((v) => !v)}
                className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {reveal ? "Hide" : "Reveal"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm p-2 rounded bg-background border border-border/60 select-all">
                {reveal ? result.temp_password : "•".repeat(result.temp_password.length)}
              </code>
              <button
                onClick={() => copy(result.temp_password, "Password")}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                title="Copy password"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              This password will not be shown again. The executive must change it on first login.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            {result.pdf_signed_url && (
              <a
                href={result.pdf_signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-xs font-semibold hover:bg-secondary/80"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FieldRow = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string, l: string) => void;
}) => (
  <div className="rounded-lg border border-border/60 bg-background p-3">
    <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
      {label.toUpperCase()}
    </p>
    <div className="flex items-center gap-1.5 mt-1">
      <span className="font-mono text-xs truncate flex-1">{value}</span>
      <button
        onClick={() => onCopy(value, label)}
        className="p-1 rounded hover:bg-muted"
        title={`Copy ${label}`}
      >
        <Copy className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  </div>
);
