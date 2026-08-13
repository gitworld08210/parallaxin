import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Flag } from "lucide-react";

type Kind = "post" | "profile" | "comment" | "message";

const REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "impersonation", label: "Impersonation" },
  { id: "nudity", label: "Nudity or sexual content" },
  { id: "violence", label: "Violence or dangerous acts" },
  { id: "hate", label: "Hate speech" },
  { id: "other", label: "Something else" },
];

export const ReportSheet = ({
  open, onOpenChange, targetKind, targetId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  targetKind: Kind;
  targetId: string | null;
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !targetId || !reason) return;
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_kind: targetKind,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    // Routing to ts_cases is handled by DB trigger (Phase 1).
    setBusy(false);
    toast.success("Report received. Thank you.");
    setReason(null); setDetails("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground text-left flex items-center gap-2">
            <Flag className="h-4 w-4" /> Report
          </SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-1">Your report is anonymous. We review every signal.</p>
        <div className="py-3 space-y-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                reason === r.id ? "bg-primary/15 text-foreground border border-primary/40" : "bg-muted text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {reason && (
          <>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Add context (optional)"
              maxLength={500}
              className="w-full bg-card border border-border rounded-md p-3 text-sm outline-none resize-none"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="mt-3 w-full py-3 rounded-md bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-60"
            >
              {busy ? "Sending…" : "Submit report"}
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
