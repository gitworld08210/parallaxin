import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AURAS = [
  { id: "ether",   label: "Ether",   color: "hsl(204 100% 60%)" },
  { id: "ember",   label: "Ember",   color: "hsl(18 100% 60%)" },
  { id: "verdant", label: "Verdant", color: "hsl(150 70% 55%)" },
  { id: "violet",  label: "Violet",  color: "hsl(275 80% 65%)" },
  { id: "gold",    label: "Gold",    color: "hsl(48 100% 60%)" },
  { id: "frost",   label: "Frost",   color: "hsl(195 80% 75%)" },
];

export const SignatureAuraPicker = () => {
  const { user, profile, refreshProfile } = useAuth() as any;
  const [current, setCurrent] = useState<string | null>(profile?.signature_aura ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCurrent(profile?.signature_aura ?? null); }, [profile?.signature_aura]);

  if (!profile?.is_founder) return null;

  const pick = async (id: string) => {
    if (!user) return;
    setBusy(true);
    setCurrent(id);
    const { error } = await supabase.from("profiles").update({ signature_aura: id }).eq("user_id", user.id);
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Signature aura updated"); refreshProfile?.(); }
  };

  return (
    <section className="px-4 py-5 border-t border-border">
      <h3 className="text-xs uppercase tracking-[0.2em] text-aura mb-3">Signature Aura</h3>
      <p className="text-xs text-muted-foreground mb-3">Only founders can claim a signature aura. It tints your identity frame across Aurelix.</p>
      <div className="grid grid-cols-3 gap-2">
        {AURAS.map((a) => (
          <button key={a.id} disabled={busy} onClick={() => pick(a.id)}
            className={`relative h-20 rounded-xl overflow-hidden border ${current === a.id ? "border-aura" : "border-border"}`}>
            <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${a.color} 0%, transparent 70%)`, opacity: 0.6 }} />
            <div className="absolute inset-0 grid place-items-center text-[11px] uppercase tracking-widest text-foreground">{a.label}</div>
            {current === a.id && (
              <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-aura text-aura-foreground grid place-items-center">
                <Check className="h-2.5 w-2.5" />
              </div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
};
