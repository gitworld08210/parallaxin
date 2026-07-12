import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFinDashboard, useFinInvoices, useFinContracts } from "@/hooks/admin-os/useFinance";
import {
  Wallet, Receipt, FileText, FileCheck, AlertTriangle, Loader2, TrendingDown,
} from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const Kpi = ({ label, value, icon: Icon, tone }: any) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${tone ?? "bg-primary/10 text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const FinanceDashboard = () => {
  const { data, isLoading } = useFinDashboard();
  const { data: invoices } = useFinInvoices();
  const { data: contracts } = useFinContracts();

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dueInvoices = (invoices ?? []).filter((i: any) => i.status !== "paid" && i.status !== "cancelled").slice(0, 5);
  const expiring = (contracts ?? []).filter((c: any) => c.end_date && new Date(c.end_date).getTime() - Date.now() < 60 * 86400000 && c.status !== "expired").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Budget" value={fmt(data?.totalBudget ?? 0)} icon={Wallet} />
        <Kpi label="Monthly Expenses" value={fmt(data?.monthlyExpenses ?? 0)} icon={TrendingDown} />
        <Kpi label="Open Invoices" value={data?.openInvoices ?? 0} icon={FileText} />
        <Kpi
          label="Compliance Alerts"
          value={data?.complianceAlerts ?? 0}
          icon={AlertTriangle}
          tone="bg-destructive/10 text-destructive"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pending Expenses" value={data?.pendingExpenses ?? 0} icon={Receipt} />
        <Kpi label="Vendor Payments Pending" value={data?.vendorPaymentsPending ?? 0} icon={Wallet} />
        <Kpi label="Active Contracts" value={data?.activeContracts ?? 0} icon={FileCheck} />
        <Kpi label="Expiring Soon" value={data?.expiringContracts ?? 0} icon={AlertTriangle} tone="bg-amber-500/10 text-amber-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Due Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">All invoices settled.</p>
            ) : (
              dueInvoices.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <p className="text-sm font-medium">{fmt(Number(i.amount))}</p>
                    <p className="text-xs text-muted-foreground font-mono">{i.invoice_id}</p>
                  </div>
                  <Badge variant={i.status === "overdue" ? "destructive" : "secondary"}>{i.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-4 w-4 text-primary" /> Contracts Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiring.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contracts expiring in the next 60 days.</p>
            ) : (
              expiring.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.contract_id}</p>
                  </div>
                  <Badge variant="outline">{c.end_date}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinanceDashboard;
