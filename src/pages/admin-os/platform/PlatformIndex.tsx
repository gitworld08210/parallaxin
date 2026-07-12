import { Link } from "react-router-dom";
import {
  CheckCircle2,
  GitBranch,
  BellRing,
  Activity as ActivityIcon,
  ListChecks,
  Search,
  FileText,
  BarChart3,
  LayoutGrid,
  Clock,
} from "lucide-react";

const ENGINES = [
  { slug: "approvals", label: "Approval Engine", icon: CheckCircle2, tagline: "Every decision, one queue." },
  { slug: "workflows", label: "Workflow Engine", icon: GitBranch, tagline: "Reusable business processes." },
  { slug: "notifications", label: "Notification Engine", icon: BellRing, tagline: "One channel for every alert." },
  { slug: "activity", label: "Activity Feed", icon: ActivityIcon, tagline: "Live operations across the OS." },
  { slug: "assignments", label: "Assignment Engine", icon: ListChecks, tagline: "Route work automatically." },
  { slug: "search", label: "Global Search", icon: Search, tagline: "Search everything you can see." },
  { slug: "documents", label: "Document Engine", icon: FileText, tagline: "Versioned files with access rules." },
  { slug: "reports", label: "Reporting Engine", icon: BarChart3, tagline: "Standardised, exportable reports." },
  { slug: "dashboards", label: "Dashboard Engine", icon: LayoutGrid, tagline: "Reusable widget dashboards." },
  { slug: "scheduler", label: "Scheduler Engine", icon: Clock, tagline: "Cron for the whole company." },
];

const PlatformIndex = () => (
  <div className="space-y-6">
    <header>
      <p className="text-[11px] font-bold tracking-[0.2em] text-primary">
        AURELIX · PLATFORM ENGINES
      </p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">Core Platform</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ten shared engines every module of Admin OS consumes. Build once — reuse everywhere.
      </p>
    </header>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ENGINES.map(({ slug, label, icon: Icon, tagline }) => (
        <Link
          key={slug}
          to={`/admin-os/platform/${slug}`}
          className="group rounded-xl border border-border/60 bg-card p-5 transition hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tagline}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

export default PlatformIndex;
