import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shield, KeyRound, Mail, Phone, Download, Trash2, EyeOff, Activity, UserX, Sparkles, LogOut, Building2 } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { useAuth } from "@/contexts/AuthProvider";

const Row = ({ to, icon: Icon, title, hint, danger }: any) => (
  <Link
    to={to}
    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card/40 border border-border/40 hover:border-aurum/40 transition-colors"
  >
    <div className={`h-9 w-9 rounded-full grid place-items-center ${danger ? "bg-[hsl(15_55%_40%_/_0.12)] text-[hsl(15_55%_55%)]" : "bg-aurum/10 text-aurum"}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium ${danger ? "text-[hsl(15_55%_60%)]" : ""}`}>{title}</p>
      {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground" />
  </Link>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="px-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">{label}</h3>
    <div className="space-y-1.5">{children}</div>
  </div>
);

import { useMyWorkspaces } from "@/hooks/organization/useMyWorkspaces";

export default function Settings() {
  const nav = useNavigate();
  const { signOut } = useAuth();
  const { workspaces } = useMyWorkspaces();
  // Prefer an owned workspace so the settings link deep-links into the admin
  // dashboard; otherwise fall back to any workspace the user belongs to.
  const primary = workspaces.find((w) => w.is_owner) ?? workspaces[0] ?? null;

  return (
    <div>
      <TopBar
        title="Settings"
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-4 pb-24 space-y-6 max-w-xl mx-auto">
        <Section label="Account">
          <Row to="/profile/edit" icon={Sparkles} title="Edit profile" hint="Name, avatar, bio" />
          <Row to="/settings/password" icon={KeyRound} title="Change password" />
          <Row to="/settings/email" icon={Mail} title="Change email" />
          <Row to="/settings/phone" icon={Phone} title="Phone number" hint="Add or change your verified number" />
        </Section>

        <Section label="Organization">
          {primary ? (
            <Row
              to={`/organization/${primary.slug}/dashboard`}
              icon={Building2}
              title="Organization workspace"
              hint={primary.is_owner ? "Manage your organization" : `Open ${primary.name}`}
            />
          ) : (
            <Row to="/onboarding/organization" icon={Building2} title="Create an organization" hint="Company, NGO, school — get an admin panel & workspace" />
          )}
        </Section>

        <Section label="Aura Shield">
          <Row to="/settings/security" icon={Shield} title="Two-factor authentication" hint="Protect with a 6-digit aura" />
          <Row to="/settings/activity" icon={Activity} title="Login activity" hint="Constellation of recent sessions" />
        </Section>

        <Section label="Privacy">
          <Row to="/settings/privacy" icon={EyeOff} title="Privacy" hint="Private account, read receipts, presence" />
          <Row to="/settings/blocked" icon={UserX} title="Blocked accounts" />
        </Section>

        <Section label="Your data">
          <Row to="/settings/export" icon={Download} title="Download your archive" />
          <Row to="/settings/delete" icon={Trash2} title="Delete account" danger />
        </Section>

        <button
          onClick={() => signOut()}
          className="w-full mt-4 rounded-2xl border border-border/40 bg-card/30 py-3.5 text-sm font-medium flex items-center justify-center gap-2 hover:border-aurum/40"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
