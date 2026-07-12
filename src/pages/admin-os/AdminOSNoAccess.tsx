import { Link, useLocation } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { EMPLOYMENT_STATUS_LABELS } from "@/features/admin-os/permissions";

const REASON_COPY: Record<string, { title: string; body: string }> = {
  not_employee: {
    title: "You're not an Aurelix employee",
    body: "Admin OS is restricted to employees onboarded by People Operations. If you believe this is a mistake, contact hr@aurelix.",
  },
  no_permission: {
    title: "Missing Admin OS permission",
    body: "Your role does not grant `admin_os.access`. Ask your department head or Founder Office to update your permissions.",
  },
  suspended: {
    title: "Your account is suspended",
    body: "Contact Security or People Operations to review your account status.",
  },
  resigned: { title: "Access ended on resignation", body: "This account is no longer active." },
  exited: { title: "Access ended after exit", body: "This account is no longer active." },
  archived: { title: "Account archived", body: "This account has been archived." },
};

const AdminOSNoAccess = () => {
  const location = useLocation();
  const reason: string = (location.state as any)?.reason ?? "no_permission";
  const copy =
    REASON_COPY[reason] ?? {
      title: `Access blocked (${EMPLOYMENT_STATUS_LABELS[reason] ?? reason})`,
      body: "Your current employment status does not permit access to Admin OS.",
    };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-lg font-bold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Aurelix
        </Link>
      </div>
    </div>
  );
};

export default AdminOSNoAccess;
