// MemberRoleBadge — UI scaffold. Compose real markup as the feature ships.
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MemberRole = "Owner" | "Admin" | "Manager" | "Lead" | "Member" | "Guest";

interface MemberRoleBadgeProps {
  role: MemberRole | string;
}

const roleStyles: Record<string, string> = {
  Owner: "bg-sky-100 text-sky-700 border-sky-200",
  Admin: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Manager: "bg-violet-100 text-violet-700 border-violet-200",
  Lead: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Member: "bg-slate-100 text-slate-700 border-slate-200",
  Guest: "bg-gray-100 text-gray-600 border-gray-200",
};

export const MemberRoleBadge = ({ role }: MemberRoleBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 font-medium",
        roleStyles[role] ?? "bg-slate-100 text-slate-700 border-slate-200",
      )}
    >
      {role}
    </Badge>
  );
};

export default MemberRoleBadge;
