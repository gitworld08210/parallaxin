import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, BadgeCheck, Clock, XCircle } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";

import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VR = { id: string; status: string; category: string; created_at: string };
const kinds = [
  { id: "public_figure", title: "Creator", desc: "Active creators with original content" },
  { id: "government", title: "Government", desc: "Official institutions and agencies" },
  { id: "business", title: "Brand", desc: "Registered brands and businesses" },
  { id: "founder", title: "Founder", desc: "Founders & company leadership" },
  { id: "media", title: "Standard", desc: "Notable public figures" },
];

const Verification = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [existing, setExisting] = useState<VR | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("public_figure");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [reason, setReason] = useState("");
  const [links, setLinks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // 1. Check Firestore
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const q = query(collection(db, "verification_requests"), where("user_id", "==", user.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          setExisting({ id: doc.id, ...doc.data() } as VR);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Firestore verification fetch failed", e);
      }

      // 2. Supabase Fallback
      const { data } = await supabase.from("verification_requests" as any).select("id, status, category, created_at").eq("user_id", user.id).maybeSingle();
      setExisting((data as unknown as VR) ?? null);
      setLoading(false);
    })();
  }, [user?.id]);

  const uploadDoc = async (f: File) => {
    const ext = f.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("verification-docs").upload(path, f);
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error("Add your full legal name");
    if (!file) return toast.error("Upload an ID document");
    setBusy(true);
    try {
      const idPath = await uploadDoc(file);
      const supportPath = supportFile ? await uploadDoc(supportFile) : null;
      const linkArr = links.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      
      const payload = {
        user_id: user.id,
        full_name: fullName.trim(),
        category,
        links: linkArr,
        id_doc_url: idPath,
        status: "pending",
        organization: organization.trim() || null,
        official_email: officialEmail.trim() || null,
        country: country.trim() || null,
        dob: dob || null,
        reason: reason.trim() || null,
        supporting_doc_url: supportPath,
      };

      try {
        // 1. Dual-write to Firestore
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        const { db: firestoreDb } = await import("@/lib/firebase");
        await addDoc(collection(firestoreDb, "verification_requests"), {
          ...payload,
          created_at: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Firestore verification submission failed", e);
      }

      // 2. Supabase Insert (Legacy/Admin OS trigger)
      const { data: inserted, error } = await supabase.from("verification_requests" as any).insert(payload as any).select("id").maybeSingle();
      if (error) throw error;

      
      toast.success("Submitted · review within 48h");
      setExisting({ id: (inserted as any)?.id ?? "tmp", status: "pending", category, created_at: new Date().toISOString() });
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); }
  };

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <TopBar
        subtitle="Identity"
        title="Verification"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>}
      />

      <div className="px-5 space-y-4">
        {existing ? (
          <GlassCard className="text-center py-8">
            {existing.status === "pending" && (
              <>
                <Clock className="h-10 w-10 mx-auto mb-3 text-primary" />
                <p className="font-display text-xl">Under review</p>
                <p className="text-sm text-muted-foreground mt-1">Submitted {new Date(existing.created_at).toLocaleDateString()} · we'll notify you within 48h.</p>
              </>
            )}
            {existing.status === "approved" && (
              <>
                <BadgeCheck className="h-10 w-10 mx-auto mb-3 text-verified" />
                <p className="font-display text-xl">Verified ✦</p>
                <p className="text-sm text-muted-foreground mt-1">Your badge is now live.</p>
              </>
            )}
            {existing.status === "rejected" && (
              <>
                <XCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
                <p className="font-display text-xl">Not approved</p>
                <p className="text-sm text-muted-foreground mt-1">You can reapply in 30 days.</p>
              </>
            )}
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {kinds.map((k) => (
                <button key={k.id} onClick={() => setCategory(k.id)} className="text-left">
                  <GlassCard className={`transition-all h-full ${category === k.id ? "border-primary/60 shadow-glow" : ""}`}>
                    <VerificationBadge kind={k.id as any} />
                    <p className="font-semibold text-sm mt-2">{k.title}</p>
                    <p className="text-[11px] text-muted-foreground">{k.desc}</p>
                  </GlassCard>
                </button>
              ))}
            </div>

            <GlassCard>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Full legal name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full mt-2 bg-transparent outline-none text-sm" placeholder="Jane Doe" />
            </GlassCard>

            <div className="grid grid-cols-2 gap-2">
              <GlassCard>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Country</label>
                <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full mt-2 bg-transparent outline-none text-sm" placeholder="US" />
              </GlassCard>
              <GlassCard>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Date of birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full mt-2 bg-transparent outline-none text-sm" />
              </GlassCard>
            </div>

            <GlassCard>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Organization (optional)</label>
              <input value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full mt-2 bg-transparent outline-none text-sm" placeholder="Company or institution" />
            </GlassCard>

            <GlassCard>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Official email (optional)</label>
              <input type="email" value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} className="w-full mt-2 bg-transparent outline-none text-sm" placeholder="you@company.com" />
            </GlassCard>

            <GlassCard>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Why should you be verified?</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full mt-2 bg-transparent outline-none text-sm resize-none" placeholder="Brief description of your notability" />
            </GlassCard>

            <GlassCard>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Reference links</label>
              <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={3} className="w-full mt-2 bg-transparent outline-none text-sm resize-none" placeholder="One per line · press, articles, official sites" />
            </GlassCard>

            <label className="block">
              <GlassCard className="flex items-center gap-3 cursor-pointer">
                <Upload className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{file ? file.name : "Upload ID document"}</p>
                  <p className="text-[11px] text-muted-foreground">Passport, gov ID, or business registry · private</p>
                </div>
              </GlassCard>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>

            <label className="block">
              <GlassCard className="flex items-center gap-3 cursor-pointer">
                <Upload className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{supportFile ? supportFile.name : "Supporting document (optional)"}</p>
                  <p className="text-[11px] text-muted-foreground">Press kit, registry doc, or organization proof</p>
                </div>
              </GlassCard>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setSupportFile(e.target.files?.[0] ?? null)} />
            </label>

            <button onClick={submit} disabled={busy} className="w-full rounded-2xl py-3.5 text-sm font-semibold bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-60">
              {busy ? "Submitting…" : "Submit for review"}
            </button>
            <p className="text-center text-[11px] text-muted-foreground pt-1">Manual review by admin · no auto-approval</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Verification;
