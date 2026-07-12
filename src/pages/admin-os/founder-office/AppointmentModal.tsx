import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppointExecutive, type ExecutiveSlot, type AppointResult } from "@/hooks/admin-os/useAppointments";

interface Props {
  slot: ExecutiveSlot;
  onClose: () => void;
  onSuccess: (result: AppointResult, personalEmail: string) => void;
}

export const AppointmentModal = ({ slot, onClose, onSuccess }: Props) => {
  const appoint = useAppointExecutive();
  const [form, setForm] = useState({
    full_name: "",
    personal_email: "",
    phone: "",
    joining_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await appoint.mutateAsync({
        slot_key: slot.key,
        ...form,
      });
      onSuccess(result, form.personal_email);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const inp =
    "w-full h-10 px-3 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border/60 shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-border/60">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary">
              APPOINT · FOUNDER OFFICE
            </p>
            <h2 className="text-lg font-bold mt-0.5">{slot.label}</h2>
            <p className="text-xs text-muted-foreground mt-1">{slot.department}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            {slot.description}
          </p>

          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Full name
            </span>
            <input
              required
              minLength={2}
              maxLength={120}
              className={inp}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. Ananya Sharma"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Personal email <span className="text-primary">(joining letter goes here)</span>
            </span>
            <input
              required
              type="email"
              maxLength={254}
              className={inp}
              value={form.personal_email}
              onChange={(e) => setForm({ ...form, personal_email: e.target.value })}
              placeholder="ananya@example.com"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Phone (optional)
              </span>
              <input
                className={inp}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91…"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Joining date
              </span>
              <input
                required
                type="date"
                className={inp}
                value={form.joining_date}
                onChange={(e) => setForm({ ...form, joining_date: e.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Notes (optional)
            </span>
            <textarea
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes visible only to founders…"
            />
          </label>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-[11px] text-muted-foreground">
            <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
              What happens next
            </p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>System generates the next AURE### employee ID and company email.</li>
              <li>A branded PDF joining letter is generated with a one-time temporary password inside.</li>
              <li>You download the PDF and email it to the appointee yourself.</li>
              <li>The appointee must change the password &amp; enable 2FA on first login.</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-secondary text-secondary-foreground px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={appoint.isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {appoint.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Appointing…
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Appoint &amp; email letter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
