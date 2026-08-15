import { BadgeCheck, CalendarDays } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export const VerificationSheet = ({
  open,
  onOpenChange,
  displayName,
  verificationKind,
  memberships,
  joined,
  verificationId,
}: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/10 bg-black p-0 max-h-[85vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />

        <SheetHeader className="px-5 pt-6 pb-4 text-left">
          <SheetTitle className="text-xl font-bold text-white">
            Verified account
          </SheetTitle>
        </SheetHeader>

        {/* Verification info */}
        <div className="px-5 space-y-5 pb-6">
          {/* Blue checkmark row */}
          <div className="flex items-start gap-3">
            <BadgeCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[15px] text-white leading-relaxed">
              This account is verified.{" "}
              <span className="text-blue-400 font-medium cursor-pointer hover:underline">
                Learn more
              </span>
            </p>
          </div>

          {/* Verified since row */}
          <div className="flex items-start gap-3">
            <CalendarDays className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-[15px] text-zinc-400 leading-relaxed">
              Verified since {joined ?? "April 2025"}.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VerificationSheet;
