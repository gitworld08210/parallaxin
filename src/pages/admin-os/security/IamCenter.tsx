import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, KeyRound, LockOpen, Lock, Timer, ShieldAlert } from "lucide-react";

const capabilities = [
  { icon: Users, label: "Employee Access", desc: "Review and manage employee application access" },
  { icon: ShieldAlert, label: "Admin Access", desc: "Elevated permission grants for admin roles" },
  { icon: KeyRound, label: "Department Permissions", desc: "Fine-grained permissions per department" },
  { icon: Timer, label: "Temporary Access", desc: "Time-bound elevated access grants" },
  { icon: Lock, label: "Account Lock", desc: "Freeze compromised or dormant accounts" },
  { icon: LockOpen, label: "Account Unlock", desc: "Restore access after verification" },
];

const IamCenter = () => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground">
      Identity & Access Management controls. All changes are recorded in the immutable audit log and require Security staff privileges.
    </p>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {capabilities.map((c) => (
        <Card key={c.label}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <c.icon className="h-4 w-4 text-primary" />
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{c.desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default IamCenter;
