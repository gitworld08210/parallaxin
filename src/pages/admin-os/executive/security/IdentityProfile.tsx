import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthProvider";
import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useSecurityScore } from "@/hooks/admin-os/useExecutiveSecurity";
import { Crown } from "lucide-react";

const IdentityProfile = () => {
  const { user } = useAuth();
  const { employee } = useEmployee();
  const { score } = useSecurityScore();

  const fields = [
    { label: "Executive ID", value: employee?.id?.slice(0, 8) ?? "—" },
    { label: "Company Email", value: user?.email ?? "—" },
    { label: "Full Name", value: employee?.full_name ?? "—" },
    { label: "Role", value: employee?.role?.name ?? "Founder" },
    { label: "Department", value: "Founder Office" },
    { label: "Status", value: employee?.status ?? "active" },
    { label: "Security Level", value: score >= 80 ? "Excellent" : score >= 50 ? "Adequate" : "At Risk" },
    { label: "Security Score", value: `${score}/100` },
    { label: "Last Login", value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—" },
  ];

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Executive Identity</h2>
          <p className="text-xs text-muted-foreground">Founder Office identity and privilege attributes.</p>
        </div>
        <Badge className="ml-auto">Founder Office</Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.label} className="rounded-lg border border-border/60 p-3">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">{f.label}</p>
            <p className="text-sm font-medium mt-1 truncate">{f.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-amber-700 dark:text-amber-400">Executive Identity Governance</p>
        <ul className="list-disc pl-4 mt-2 space-y-1">
          <li>Founder Office accounts cannot be self-created.</li>
          <li>Credentials must never be shared.</li>
          <li>Every login generates immutable audit logs.</li>
          <li>Emergency recovery preserves complete audit history.</li>
        </ul>
      </div>
    </Card>
  );
};

export default IdentityProfile;
