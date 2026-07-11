import { Link } from "react-router-dom";
import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";
import type { WorkspaceSummary } from "@/types/organization/organization";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  verificationKind: string | null;
  memberships: WorkspaceSummary[];
  joined: string | null;
  verificationId?: string | null;
}

const kindCopy: Record<string, string> = {
  verified: "This account is verified.",
  business: "This account is verified as a business on Aurelix.",
  brand: "This account is verified as a brand on Aurelix.",
  gov: "This account is verified as a government entity on Aurelix.",
  government: "This account is verified as a government entity on Aurelix.",
  founder: "This account is verified as a founder on Aurelix.",
  creator: "This account is verified as a creator on Aurelix.",
  public_figure: "This account is verified as a public figure on Aurelix.",
  media: "This account is verified as media on Aurelix.",
};

export const VerificationSheet = ({
  open,
  onOpenChange,
  displayName,
  verificationKind,
  memberships,
  joined,
  verificationId,
}: Props) => {
  const affiliated = memberships.filter((m) => m.verified);
  const primary = kindCopy[verificationKind ?? "verified"] ?? kindCopy.verified;
  const hasOrgs = affiliated.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-border bg-background p-0 max-h-[85vh] overflow-y-auto"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-5 pt-5 pb-3 text-left">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <SheetTitle className="text-xl font-extrabold tracking-tight">
              Verified account
            </SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground pt-2 leading-relaxed">
            {primary}
            {hasOrgs && " It's also an affiliate of "}
            {hasOrgs && (
              <span className="text-primary font-medium">
                {affiliated.map((a) => a.name).join(", ")}
              </span>
            )}
            {hasOrgs && " on Aurelix."}
          </p>
        </SheetHeader>

        {hasOrgs && (
          <div className="px-5 pt-2 pb-2">
            <p className="text-[13px] font-semibold pb-2">Affiliated organizations</p>
            <ul className="space-y-2">
              {affiliated.map((m) => (
                <li key={m.id}>
                  <Link
                    to={`/organization/${m.slug}/dashboard`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 hover:bg-secondary/60 transition-colors px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {m.logo_url ? (
                      <img
                        src={m.logo_url}
                        alt=""
                        className="h-11 w-11 rounded-xl object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-secondary grid place-items-center ring-1 ring-border">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight inline-flex items-center gap-1">
                        <span className="truncate">{m.name}</span>
                        <BadgeCheck
                          className="h-4 w-4 text-primary shrink-0"
                          strokeWidth={2.5}
                        />
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.is_owner ? "Owner" : m.role_names[0] ?? "Member"}
                      </p>
                    </div>
                    <span className="inline-flex items-center justify-center h-8 px-3 rounded-full border border-border text-xs font-semibold text-foreground group-hover:bg-secondary/60">
                      View
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-5 py-4 grid grid-cols-2 gap-3 border-t border-border mt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Verified since
            </p>
            <p className="text-sm font-semibold mt-0.5">{joined ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Verification ID
            </p>
            <p className="text-sm font-semibold mt-0.5 font-mono">
              {verificationId ?? "AX-VERIFIED"}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center gap-2 text-primary">
          <VerificationBadge kind={verificationKind ?? "verified"} className="h-4 w-4" />
          <span className="text-sm font-semibold">Verified by Aurelix</span>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VerificationSheet;
