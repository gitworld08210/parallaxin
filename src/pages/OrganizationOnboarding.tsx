import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Building2, Upload, Sparkles } from "lucide-react";
import { ORG_TYPES } from "@/lib/orgTypes";
import type { OrgType } from "@/types/organization/organization";

const input =
  "w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/60 transition-colors";

const OrganizationOnboarding = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    website: "",
    industry: "",
    org_type: "company" as OrgType,
    description: "",
    country: "",
    location: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onLogo = async (file: File) => {
    if (!user) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `org-logos/${user.id}/${Date.now()}.${ext}`;
      if (error) throw error;
      setLogoUrl(data.publicUrl);
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setLogoUploading(false);
    }
  };

  const submit = async () => {
    if (!form.name.trim() || form.username.trim().length < 3) {
      toast.error("Name and a 3+ char username are required");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("create_organization" as any, {
        p_name: form.name.trim(),
        p_username: form.username.trim().toLowerCase(),
        p_org_type: form.org_type,
        p_description: form.description?.trim() || null,
        p_logo_url: logoUrl || null,
        p_cover_url: null,
      } as any);
      if (error) throw error;

      toast.success("Organization created ✦");
      nav(`/organization/dashboard`, { replace: true });
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="relative mx-auto max-w-lg px-5 py-8">
        <div className="text-center mb-6">
          <span className="inline-flex h-14 w-14 rounded-2xl bg-gradient-primary items-center justify-center shadow-glow mb-3">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Set up your organization</h1>
          <p className="text-sm text-muted-foreground mt-1">Companies, startups, NGOs, schools — all welcome.</p>
        </div>

        {/* Logo */}
        <label className="block mb-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl border border-border bg-secondary/40 grid place-items-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl bg-secondary border border-border cursor-pointer">
                <Upload className="h-4 w-4" /> {logoUploading ? "Uploading…" : "Upload logo"}
              </span>
              <p className="text-xs text-muted-foreground mt-1">PNG or JPG, ideally square.</p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
            />
          </div>
        </label>

        <div className="space-y-3">
          <input className={input} placeholder="Organization name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <input className={input} placeholder="Username (letters, numbers, _)" value={form.username} onChange={(e) => set("username", e.target.value)} />
          <input className={input} placeholder="Official email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <input className={input} placeholder="Website (optional)" value={form.website} onChange={(e) => set("website", e.target.value)} />
          <input className={input} placeholder="Industry (e.g. Fintech, Education)" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          <select
            className={input}
            value={form.org_type}
            onChange={(e) => set("org_type", e.target.value)}
          >
            {ORG_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <textarea
            className={input + " min-h-[100px] resize-none"}
            placeholder="Describe your organization…"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="Country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            <input className={input} placeholder="City / Location" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
        </div>

        <button
          disabled={busy}
          onClick={submit}
          className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold text-sm shadow-glow disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {busy ? "Creating…" : "Create organization"}
        </button>

        <button
          onClick={() => nav("/onboarding", { replace: true })}
          className="mt-3 w-full text-center text-xs text-muted-foreground"
        >
          Not an organization? Continue as personal →
        </button>
      </div>
    </div>
  );
};

export default OrganizationOnboarding;
