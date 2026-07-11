import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import type { WorkspaceSummary } from "@/types/organization/organization";
import { Building2, BadgeCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: string | null;
  verified: boolean;
  verifiedSince?: string | null;
  verifiedBy?: string | null;
  verificationId?: string | null;
  reason?: string | null;
  displayName: string;
  username: string;
  organizations: WorkspaceSummary[];
}

const KIND_LABEL: Record<string, string> = {
  verified: "Verified account",
  creator: "Verified creator",
  public_figure: "Verified public figure",
  government: "Government account",
  gov: "Government account",
  business: "Verified business",
  brand: "Verified brand",
  media: "Verified media",
  founder: "Founder",
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

/**
 * Premium bottom sheet that opens when the verification badge is tapped.
 * iOS-quality: rounded top corners, blurred overlay, spring animation
 * inherited from Radix Sheet primitive.
 */
export const VerificationSheet = ({
  open,
  onOpenChange,
  kind,
  verified,
  verifiedSince,
  verifiedBy,
  verificationId,
  reason,
  displayName,
  username,
  organizations,
}: Props) => {
  const label = (kind && KIND_LABEL[kind]) || "Verification";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "p-0 rounded-t-3xl border-t border-border bg-surface-elevated",
          "max-h-[85vh] overflow-y-auto",
          "shadow-xl",
        )}
      >
        {/* grabber */}
        <div className="pt-2 pb-1 grid place-items-center" aria-hidden>
          <span className="block h-1.5 w-10 rounded-full bg-border" />
        </div>

        <SheetHeader className="px-6 pt-2">
          <SheetTitle className="sr-only">Verification details</SheetTitle>
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              {kind ? <VerificationBadge kind={kind} className="[&>svg]:h-6 [&>svg]:w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div className="text-left">
              <p className="text-base font-semibold leading-tight">{label}</p>
              <p className="text-xs text-muted-foreground">
                {displayName} · @{username}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 mt-5 space-y-3">
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            <Row label="Status" value={verified ? "Active" : "Inactive"} tone={verified ? "success" : undefined} />
            {kind && <Row label="Type" value={label} />}
            <Row label="Verified since" value={formatDate(verifiedSince)} />
            <Row label="Verification ID" value={verificationId ?? "—"} mono />
            <Row label="Verified by" value={verifiedBy ?? "Aurelix Trust & Safety"} />
          </div>

          {reason && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Reason
              </p>
              <p className="text-sm text-foreground/90">{reason}</p>
            </div>
          )}
        </div>

        {organizations.length > 0 && (
          <div className="px-6 mt-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Affiliated organizations
            </p>
            <div className="space-y-2">
              {organizations.map((o) => (
                <Link
                  key={o.id}
                  to={`/organization/${o.slug}/dashboard`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {o.logo_url ? (
                    <img src={o.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-border" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center ring-1 ring-border">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{o.name}</span>
                      {o.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.is_owner ? "Owner" : o.role_names[0] ?? "Member"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="h-6 sm:h-8" />
      </SheetContent>
    </Sheet>
  );
};

const Row = ({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "success";
  mono?: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-3 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={cn(
        "font-medium max-w-[60%] truncate text-right",
        mono && "font-mono text-xs",
        tone === "success" && "text-[hsl(var(--success))]",
      )}
    >
      {value}
    </span>
  </div>
);

export default VerificationSheet;
