import { useVerApplications, useVerBadges, useVerAppeals } from "@/hooks/admin-os/useVerification";
import { useContentQueue } from "@/features/content-understanding/hooks/useContentQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Inbox, ShieldCheck, Gavel, Clock, CheckCircle2, XCircle, BrainCircuit } from "lucide-react";

const Stat = ({ icon: Icon, label, value, tone = "" }: { icon: any; label: string; value: number | string; tone?: string }) => (
  <Card><CardContent className="pt-6 flex items-center gap-4">
    <div className={`rounded-lg p-3 ${tone || "bg-primary/10 text-primary"}`}><Icon className="h-5 w-5" /></div>
    <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>
  </CardContent></Card>
);

const VerificationDashboard = () => {
  const { data: apps = [] } = useVerApplications();
  const { data: badges = [] } = useVerBadges();
  const { data: appeals = [] } = useVerAppeals();
  const { data: contentQueue = [] } = useContentQueue();

  const pending = apps.filter(a => ["pending","under_review","info_required"].includes(a.status)).length;
  const approved = apps.filter(a => a.status === "approved").length;
  const rejected = apps.filter(a => a.status === "rejected").length;
  const active = badges.filter(b => b.status === "approved").length;
  const openAppeals = appeals.filter(a => a.status === "pending" || a.status === "under_review").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Inbox} label="Pending applications" value={pending} tone="bg-amber-500/10 text-amber-600" />
        <Stat icon={CheckCircle2} label="Approved" value={approved} tone="bg-emerald-500/10 text-emerald-600" />
        <Stat icon={XCircle} label="Rejected" value={rejected} tone="bg-rose-500/10 text-rose-600" />
        <Stat icon={ShieldCheck} label="Active badges" value={active} />
        <Stat icon={BrainCircuit} label="Content review" value={contentQueue.length} tone="bg-indigo-500/10 text-indigo-600" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Open appeals</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3 text-sm">
            <Gavel className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">{openAppeals}</span>
            <span className="text-muted-foreground">awaiting secondary review</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {apps.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="truncate">{a.application_number} · {a.subject_display_name}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{a.status}</span>
              </div>
            ))}
            {apps.length === 0 && <p className="text-muted-foreground">No applications yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificationDashboard;
