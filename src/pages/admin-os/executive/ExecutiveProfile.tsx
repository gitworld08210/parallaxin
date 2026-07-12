import { useEmployee } from "@/hooks/admin-os/useEmployee";
import { useAuth } from "@/contexts/AuthProvider";
import { UserRound } from "lucide-react";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-0">
    <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
      {label}
    </p>
    <p className="text-sm font-medium text-right break-words">{value ?? "—"}</p>
  </div>
);

const ExecutiveProfile = () => {
  const { employee } = useEmployee();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            EXECUTIVE · PROFILE
          </p>
          <h1 className="text-2xl font-bold">Founder Profile</h1>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-6 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold overflow-hidden">
          {employee?.photo_url
            ? <img src={employee.photo_url} alt="" className="h-full w-full object-cover" />
            : employee?.full_name?.slice(0, 2).toUpperCase() ?? "FO"}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">{employee?.full_name ?? "—"}</p>
          <p className="text-sm text-muted-foreground truncate">{employee?.company_email}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <Row label="Employee ID" value={employee?.employee_number} />
        <Row label="Role" value={employee?.role?.name} />
        <Row label="Department" value={employee?.department?.name ?? "Founder Office"} />
        <Row label="Level" value={employee?.level} />
        <Row label="Company email" value={employee?.company_email} />
        <Row label="Status" value={employee?.employment_status} />
        <Row label="Last sign-in" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"} />
        <Row label="Account created" value={user?.created_at ? new Date(user.created_at).toLocaleString() : "—"} />
      </div>
    </div>
  );
};

export default ExecutiveProfile;
