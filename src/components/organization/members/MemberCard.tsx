// MemberCard — UI scaffold. Compose real markup as the feature ships.
import { MoreVertical, Mail, Building2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import MemberRoleBadge from "./MemberRoleBadge";

interface MemberCardProps {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  department: string;
  online?: boolean;
}

export const MemberCard = ({ name, email, avatar, role, department, online = false }: MemberCardProps) => {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatar} />

              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>

            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
                online ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">{name}</h3>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Mail className="h-4 w-4" />

              {email}
            </div>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <Building2 className="h-4 w-4" />

              {department}
            </div>
          </div>
        </div>

        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <MemberRoleBadge role={role} />

        <span className={`text-sm font-medium ${online ? "text-emerald-600" : "text-slate-500"}`}>
          {online ? "Online" : "Offline"}
        </span>
      </div>
    </Card>
  );
};

export default MemberCard;
