import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuraFrame } from "@/components/founders/AuraFrame";
import { FounderBadge } from "@/components/founders/FounderBadge";
import { initialsOf } from "@/lib/format";

type Founder = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  founder_title: string | null;
  aura_rank: string | null;
  join_era: string | null;
  council_role: string | null;
};

export const HallOfFoundersScreen = () => {
  const [founders, setFounders] = useState<Founder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id, username, display_name, avatar_url, founder_title, aura_rank, join_era, council_role")
        .eq("is_founder" as any, true as any)
        .order("created_at", { ascending: true })
        .limit(120);
      setFounders((data ?? []) as Founder[]);
      setLoading(false);
    })();
  }, []);

  const genesis = founders.filter((f) => f.join_era === "genesis");
  const legendary = founders.filter((f) => f.join_era !== "genesis");

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif" }}>
      {/* cinematic header */}
      <div className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(48 100% 60% / 0.18), transparent 70%)" }} />
        <div aria-hidden className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(40% 30% at 50% 60%, hsl(204 100% 60% / 0.18), transparent 70%)" }} />
        <header className="relative h-14 px-3 flex items-center">
          <Link to="/profile" className="p-1" aria-label="Back"><ChevronLeft className="h-6 w-6" /></Link>
        </header>
        <div className="relative px-6 pt-6 pb-12 text-center">
          <CentralSigil />
          <p className="mt-6 text-[10px] uppercase tracking-[0.5em] text-aura/80">Archive · MMXXVI</p>
          <h1 className="mt-2 text-4xl font-light tracking-wide">Hall of Founders</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
            The pioneers who shaped Aurelix in its first era. Each name a thread in the civilization's chronicle.
          </p>
        </div>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground py-12">Opening the archive…</p>}

      {/* Genesis Era */}
      {genesis.length > 0 && (
        <section className="px-4 pt-10 pb-6 border-t border-border/40">
          <SectionHeader eyebrow="Era I" title="Genesis" desc="The first to set foot inside Aurelix." />
          <GenesisArc members={genesis} />
        </section>
      )}

      {/* Legendary */}
      {legendary.length > 0 && (
        <section className="px-4 pt-10 pb-20 border-t border-border/40">
          <SectionHeader eyebrow="Era II" title="Legendary Members" desc="Architects, curators, and visionaries of the second wave." />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 mt-8">
            {legendary.map((f) => <FounderCard key={f.user_id} f={f} />)}
          </div>
        </section>
      )}

      {!loading && founders.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-16" style={{ fontFamily: "Inter, sans-serif" }}>
          The archive awaits its first names.
        </p>
      )}

      <div className="text-center pb-12 pt-4">
        <Link to="/founder-council" className="inline-block text-[11px] uppercase tracking-[0.4em] text-aura/80 border border-aura/30 px-5 py-2.5 rounded-full"
          style={{ fontFamily: "Inter, sans-serif" }}>
          Enter the Council Chambers
        </Link>
      </div>
    </div>
  );
};

const SectionHeader = ({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) => (
  <div className="text-center">
    <p className="text-[10px] uppercase tracking-[0.5em] text-aura/70">{eyebrow}</p>
    <h2 className="mt-2 text-2xl font-light">{title}</h2>
    <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>{desc}</p>
  </div>
);

const FounderCard = ({ f }: { f: Founder }) => (
  <Link to={`/founders/${f.username}`} className="flex flex-col items-center text-center group">
    <AuraFrame src={f.avatar_url ?? undefined} size={84} tier={f.join_era === "genesis" ? "genesis" : "founder"} initials={initialsOf(f.display_name || f.username)} />
    <div className="mt-3 inline-flex items-center gap-1.5">
      <p className="text-base font-medium">{f.display_name || f.username}</p>
      <FounderBadge tier={f.join_era === "genesis" ? "genesis" : "founder"} size={11} />
    </div>
    {f.founder_title && (
      <p className="text-[11px] uppercase tracking-[0.25em] text-aura/80 mt-1">{f.founder_title}</p>
    )}
    {f.aura_rank && (
      <p className="text-[11px] text-muted-foreground mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>{f.aura_rank}</p>
    )}
  </Link>
);

/** Genesis members arranged in a gentle arc with a central sigil. */
const GenesisArc = ({ members }: { members: Founder[] }) => {
  const top = members.slice(0, 5);
  const rest = members.slice(5);
  return (
    <div className="mt-10">
      <div className="flex items-end justify-center gap-3 px-2">
        {top.map((f, i) => {
          const offset = Math.abs(i - Math.floor(top.length / 2));
          return (
            <div key={f.user_id} style={{ transform: `translateY(${offset * 10}px)` }}>
              <FounderCard f={f} />
            </div>
          );
        })}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 mt-10">
          {rest.map((f) => <FounderCard key={f.user_id} f={f} />)}
        </div>
      )}
    </div>
  );
};

const CentralSigil = () => (
  <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
    <div aria-hidden className="absolute inset-0 animate-[aura-spin_40s_linear_infinite]">
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-80">
        <defs>
          <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(48 100% 70%)" />
            <stop offset="100%" stopColor="hsl(28 100% 55%)" />
          </linearGradient>
        </defs>
        <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" fill="none" stroke="url(#goldStroke)" strokeWidth="0.6" />
        <polygon points="50,16 80,33 80,67 50,84 20,67 20,33" fill="none" stroke="hsl(48 100% 70% / 0.5)" strokeWidth="0.4" />
      </svg>
    </div>
    <div aria-hidden className="absolute inset-4 animate-[aura-spin_60s_linear_infinite] [animation-direction:reverse]">
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-70">
        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(204 100% 70% / 0.4)" strokeWidth="0.3" strokeDasharray="2 4" />
      </svg>
    </div>
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-3 w-3 rounded-full bg-aura shadow-[0_0_18px_hsl(48_100%_60%/0.8)]" />
    </div>
  </div>
);

export default HallOfFoundersScreen;
