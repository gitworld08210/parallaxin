import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Wallet,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  FileText,
  FileCheck,
  Building2,
  ShoppingCart,
  ShieldCheck,
  Landmark,
  BadgeDollarSign,
  HandCoins,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/admin-os/finance-legal", label: "Payment Approvals", icon: CircleDollarSign, end: true },
  { to: "/admin-os/finance-legal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin-os/finance-legal/budgets", label: "Budgets", icon: PiggyBank },
  { to: "/admin-os/finance-legal/expenses", label: "Expenses", icon: Receipt },
  { to: "/admin-os/finance-legal/invoices", label: "Invoices", icon: FileText },
  { to: "/admin-os/finance-legal/procurement", label: "Procurement", icon: ShoppingCart },
  { to: "/admin-os/finance-legal/vendors", label: "Vendors", icon: Building2 },
  { to: "/admin-os/finance-legal/contracts", label: "Contracts", icon: FileCheck },
  { to: "/admin-os/finance-legal/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/admin-os/finance-legal/creator-payouts", label: "Creator Payouts", icon: HandCoins },
  { to: "/admin-os/finance-legal/hire-approvals", label: "Hire Approvals", icon: BadgeDollarSign },
  { to: "/admin-os/finance-legal/new-hire-bank", label: "New Hire Bank", icon: Landmark },
];

const FinanceLegalShell = () => {
  const loc = useLocation();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
            OPERATIONS · FINANCE & LEGAL
          </p>
          <h1 className="text-2xl font-bold">Finance & Legal</h1>
        </div>
      </div>
      <div className="flex overflow-x-auto gap-1 border-b border-border/60 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = t.end ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
};

export default FinanceLegalShell;
