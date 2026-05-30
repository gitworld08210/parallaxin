import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, Landmark, Crown, Star, Briefcase, Mic, Check, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/vibe/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

const TYPES = [
  { id: "government", title: "Government / Official", desc: "For government officials & entities", icon: Landmark },
  { id: "founder", title: "Founder", desc: "For founders & co-founders", icon: Crown },
  { id: "public_figure", title: "Public Figure", desc: "For public personalities", icon: Star },
  { id: "business", title: "Business / Brand", desc: "For businesses & organizations", icon: Briefcase },
  { id: "media", title: "Media / Journalist", desc: "For media professionals", icon: Mic },
] as const;

type TypeId = typeof TYPES[number]["id"];

const STEPS = ["Type", "Identity", "Proof", "Context", "Review"];

const VerificationRequest = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [blocked, setBlocked] = useState<null | "pending" | "verified">(null);

  // Form state
  const [category, setCategory] = useState<TypeId | "">("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [organization, setOrganization] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [reason, setReason] = useState("");
  const [links, setLinks] = useState("");
  const [supportDoc, setSupportDoc] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // Guard against duplicate submissions
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pf } = await supabase.from("profiles").select("verified").eq("user_id", user.id).maybeSingle();
      if (pf?.verified) { setBlocked("verified"); return; }
      const { data: vr } = await supabase
        .from("verification_requests")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (vr) setBlocked("pending");
    })();
  }, [user?.id]);

  const canNext = useMemo(() => {
    if (step === 0) return !!category;
    if (step === 1) return fullName.trim().length >= 2 && country.trim().length >= 2;
    if (step === 2) return !!idDoc;
    if (step === 3) return reason.trim().length >= 10;
    return true;
  }, [step, category, fullName, country, idDoc, reason]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => (step === 0 ? nav("/verification") : setStep((s) => s - 1));

  const submit = async () => {
    if (!user || !category || !idDoc) return;
    setBusy(true);
    try {
      // Upload ID doc
      const idExt = idDoc.name.split(".").pop() || "jpg";
      const idPath = `${user.id}/id-${crypto.randomUUID()}.${idExt}`;
      const { error: idErr } = await supabase.storage.from("verification-docs").upload(idPath, idDoc);
      if (idErr) throw idErr;

      // Upload supporting doc (optional)
      let supportPath: string | null = null;
      if (supportDoc) {
        const sExt = supportDoc.name.split(".").pop() || "jpg";
        supportPath = `${user.id}/support-${crypto.randomUUID()}.${sExt}`;
        const { error: sErr } = await supabase.storage.from("verification-docs").upload(supportPath, supportDoc);
        if (sErr) throw sErr;
      }

      const linkArr = links.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        category,
        full_name: fullName.trim(),
        country: country.trim() || null,
        dob: dob || null,
        id_doc_url: idPath,
        organization: organization.trim() || null,
        official_email: officialEmail.trim() || null,
        reason: reason.trim(),
        links: linkArr,
        supporting_doc_url: supportPath,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Submitted · we'll review within 48h");
      nav("/verification", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setBusy(false);
    }
  };

  if (blocked) {
    return (
      <div>
        <Header onBack={() => nav("/verification")} />
        <div className="px-5 pt-10">
          <GlassCard className="text-center py-10">
            <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-primary" />
            <p className="font-display text-xl">
              {blocked === "pending" ? "Request already under review" : "You're already verified"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {blocked === "pending" ? "We'll notify you within 48h." : "Your badge is live on your profile."}
            </p>
            <button onClick={() => nav("/verification")} className="mt-5 px-5 py-2.5 rounded-full bg-gradient-primary text-primary-foreground text-sm font-semibold shadow-glow">
              Back to Center
            </button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <Header onBack={back} />

      {/* Step indicator */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  i === step
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : i < step
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${i < step ? "bg-primary/50" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-6 space-y-4">
        {step === 0 && (
          <>
            <SectionTitle title="Select Type" subtitle="Choose verification type" />
            <div className="space-y-2.5">
              {TYPES.map((t) => {
                const active = category === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setCategory(t.id)}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      active
                        ? "border-primary/60 bg-primary/10 shadow-glow"
                        : "border-border bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${active ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{t.title}</p>
                      <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"} grid place-items-center`}>
                      {active && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <SectionTitle title="Identity" subtitle="Tell us who you are" />
            <Field label="Full legal name" required>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder="Jane Doe" />
            </Field>
            <Field label="Country" required>
              <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder="United States" />
            </Field>
            <Field label="Date of birth (optional)">
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full bg-transparent outline-none text-sm" />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle title="Proof of Identity" subtitle="Upload a government-issued ID" />
            <FileField file={idDoc} onChange={setIdDoc} hint="Passport, gov ID, or business registry · stored privately" />
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle title="Context" subtitle="Help us understand your request" />
            <Field label="Organization (optional)">
              <input value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder="Company / publication" />
            </Field>
            <Field label="Official email (optional)">
              <input type="email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} className="w-full bg-transparent outline-none text-sm" placeholder="name@organization.com" />
            </Field>
            <Field label="Why should you be verified?" required>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full bg-transparent outline-none text-sm resize-none" placeholder="Tell us why this matters…" />
            </Field>
            <Field label="Reference links (optional)">
              <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={2} className="w-full bg-transparent outline-none text-sm resize-none" placeholder="One per line · press, articles, official sites" />
            </Field>
            <p className="text-xs text-muted-foreground px-1">Optional supporting document</p>
            <FileField file={supportDoc} onChange={setSupportDoc} hint="Press, business license, or supporting paperwork" />
          </>
        )}

        {step === 4 && (
          <>
            <SectionTitle title="Review" subtitle="Confirm and submit" />
            <GlassCard className="p-0 overflow-hidden divide-y divide-border">
              <ReviewRow label="Type" value={TYPES.find((t) => t.id === category)?.title ?? "—"} />
              <ReviewRow label="Full name" value={fullName || "—"} />
              <ReviewRow label="Country" value={country || "—"} />
              {dob && <ReviewRow label="Date of birth" value={dob} />}
              <ReviewRow label="ID document" value={idDoc?.name ?? "—"} />
              {organization && <ReviewRow label="Organization" value={organization} />}
              {officialEmail && <ReviewRow label="Official email" value={officialEmail} />}
              <ReviewRow label="Reason" value={reason} multiline />
              {links && <ReviewRow label="Links" value={links} multiline />}
              {supportDoc && <ReviewRow label="Supporting doc" value={supportDoc.name} />}
            </GlassCard>
            <p className="text-center text-[11px] text-muted-foreground pt-1">
              Manual review by admin · we'll respond within 48h
            </p>
          </>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-5 pb-5 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="max-w-screen-sm mx-auto flex gap-3">
          {step > 0 && (
            <button
              onClick={back}
              className="px-5 rounded-2xl py-3.5 text-sm font-semibold border border-border bg-card"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canNext}
              className="flex-1 rounded-2xl py-3.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 rounded-2xl py-3.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Header = ({ onBack }: { onBack: () => void }) => (
  <header className="h-14 px-2 flex items-center justify-between border-b border-border sticky top-0 z-30 bg-background/95 backdrop-blur">
    <button onClick={onBack} className="h-10 w-10 grid place-items-center rounded-full hover:bg-muted/40">
      <ChevronLeft className="h-5 w-5" />
    </button>
    <h1 className="text-base font-semibold">Request Verification</h1>
    <div className="h-10 w-10" />
  </header>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="px-1">
    <p className="font-display text-xl">{title}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
  </div>
);

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <GlassCard>
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
      {label} {required && <span className="text-primary">*</span>}
    </label>
    <div className="mt-2">{children}</div>
  </GlassCard>
);

const FileField = ({ file, onChange, hint }: { file: File | null; onChange: (f: File | null) => void; hint: string }) => (
  <label className="block">
    <GlassCard className="flex items-center gap-3 cursor-pointer">
      <Upload className="h-5 w-5 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{file ? file.name : "Upload document"}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </GlassCard>
    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
  </label>
);

const ReviewRow = ({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) => (
  <div className="px-4 py-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
    <p className={`text-sm mt-1 ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value}</p>
  </div>
);

export default VerificationRequest;
