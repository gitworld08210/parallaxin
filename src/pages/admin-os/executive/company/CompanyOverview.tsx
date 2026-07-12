import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Building2, Palette, ToggleLeft, Boxes, Languages, Calendar as CalIcon, Hash, Globe,
} from "lucide-react";
import { useCompanyConfigurations, useFeatureFlags, useModules, useCalendarEvents } from "@/hooks/admin-os/useCompanyConfig";

const items = [
  { to: "profile", title: "Company Profile", icon: Building2, desc: "Legal, contact, headquarters, registration." },
  { to: "brand", title: "Brand Management", icon: Palette, desc: "Logos, colors, typography, email branding." },
  { to: "preferences", title: "Platform Preferences", icon: Globe, desc: "Session, uploads, notifications, formats." },
  { to: "localization", title: "Localization", icon: Languages, desc: "Languages, regions, timezones, currency." },
  { to: "features", title: "Feature Flags", icon: ToggleLeft, desc: "Toggle features, beta rollouts, targeting." },
  { to: "modules", title: "Module Management", icon: Boxes, desc: "Enable, disable, maintenance, dependencies." },
  { to: "calendar", title: "Company Calendar", icon: CalIcon, desc: "Working days, holidays, review calendars." },
  { to: "metadata", title: "Company Metadata", icon: Hash, desc: "IDs, prefixes, document numbering." },
];

const CompanyOverview = () => {
  const { data: cfgs = [] } = useCompanyConfigurations();
  const { data: flags = [] } = useFeatureFlags();
  const { data: modules = [] } = useModules();
  const { data: cal = [] } = useCalendarEvents();

  const stats = [
    { label: "Configurations", value: cfgs.length },
    { label: "Feature Flags", value: flags.length },
    { label: "Active Modules", value: modules.filter((m: any) => m.status === "active").length },
    { label: "Calendar Events", value: cal.length },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((i) => (
          <Link key={i.to} to={i.to}>
            <Card className="p-5 h-full hover:border-primary/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <i.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{i.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CompanyOverview;
