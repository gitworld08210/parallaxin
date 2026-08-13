import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Crown, Sparkles, Shield, Vote, Infinity as InfinityIcon, Gem, Rocket, Scroll } from "lucide-react";

import { AuraFrame } from "@/components/founders/AuraFrame";
import { FounderBadge } from "@/components/founders/FounderBadge";
import { initialsOf } from "@/lib/format";

type Seat = {
  seat_number: number;
  user_id: string | null;
  council_role: string | null;
  founder_title: string | null;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    aura_rank: string | null;
    join_era: string | null;
  } | null;
};

const PERKS = [
  { icon: Crown, title: "Genesis Mark", desc: "Eternal founder badge across the civilization." },
  { icon: Sparkles, title: "Signature Aura", desc: "Animated gradient frame on every appearance." },
  { icon: Vote, title: "Council Vote ×3", desc: "Triple weight on platform proposals." },
  { icon: Scroll, title: "Founder Era", desc: "Permanent join_era marker — 'founder'." },
  { icon: Shield, title: "Founder Chat Ring", desc: "Private chamber for the inducted few." },
  { icon: InfinityIcon, title: "Premium for Life", desc: "All future paid tiers, always free." },
  { icon: Rocket, title: "Early Access", desc: "First to test every new frontier." },
  { icon: Gem, title: "Genesis Wall", desc: "Name engraved in the Settings → About archive." },
];

export const HallOfFoundersScreen = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("founder_seats" as any).select("seat_number, user_id, council_role, founder_title").order("seat_number", { ascending: true });

      const rows = (data ?? []) as Seat[];
      const ids = rows.map((r) => r.user_id).filter(Boolean) as string[];
      let profiles: Record<string, Seat["profile"]> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, aura_rank, join_era").in("user_id", ids);
        for (const p of (profs ?? []) as any[]) profiles[p.user_id] = p;
      }
      setSeats(rows.map((s) => ({ ...s, profile: s.user_id ? profiles[s.user_id] ?? null : null })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif" }}>
      <div className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(60% 50% at 50% 0%, hsl(48 100% 60% / 0.18), transparent 70%)" }} />
        <header className="relative h-14 px-3 flex items-center">
          <Link to="/profile" className="p-1" aria-label="Back"><ChevronLeft className="h-6 w-6" /></Link>
        </header>
        <div className="relative px-6 pt-6 pb-12 text-center">
          <CentralSigil />
          <p className="mt-6 text-[10px] uppercase tracking-[0.5em] text-aura/80">Archive · MMXXVI</p>
          <h1 className="mt-2 text-4xl font-light tracking-wide">Hall of Founders</h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
            Fifty seats. Invitation only. Each carries the founding light of Aurelix.
          </p>
        </div>
      </div>

      {/* Perks */}
      <section className="px-5 pb-10 border-t border-border/40 pt-10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.5em] text-aura/70">Birthright</p>
          <h2 className="mt-2 text-2xl font-light">Perks of the Hall</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6" style={{ fontFamily: "Inter, sans-serif" }}>
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-aura/20 bg-card/50 p-4">
              <p.icon className="h-5 w-5 text-aura" />
              <p className="mt-2 text-sm font-semibold">{p.title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-snug">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Seats */}
      <section className="px-4 pb-20 border-t border-border/40 pt-10">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.5em] text-aura/70">The Fifty</p>
          <h2 className="mt-2 text-2xl font-light">Seats of the Council</h2>
        </div>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Opening the archive…</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 mt-8">
            {seats.map((s) => <SeatCard key={s.seat_number} s={s} />)}
          </div>
        )}
      </section>

      <div className="text-center pb-12 pt-4">
        <Link to="/founder-council" className="inline-block text-[11px] uppercase tracking-[0.4em] text-aura/80 border border-aura/30 px-5 py-2.5 rounded-full"
          style={{ fontFamily: "Inter, sans-serif" }}>
          Enter the Council Chambers
        </Link>
      </div>
    </div>
  );
};

const SeatCard = ({ s }: { s: Seat }) => {
  const filled = !!s.profile;
  const inner = (
    <div className="flex flex-col items-center text-center group">
      <div className="relative">
        {filled ? (
          <AuraFrame
            src={s.profile?.avatar_url ?? undefined}
            size={84}
            tier={s.profile?.join_era === "genesis" ? "genesis" : "founder"}
            initials={initialsOf(s.profile?.display_name || s.profile?.username || "")}
          />
        ) : (
          <div className="h-[84px] w-[84px] rounded-full border border-dashed border-aura/30 grid place-items-center text-aura/40">
            <Crown className="h-6 w-6" />
          </div>
        )}
        <span className="absolute -top-1 -right-1 text-[10px] font-semibold tracking-wider text-aura/80 bg-background/80 border border-aura/30 rounded-full px-1.5 py-0.5"
          style={{ fontFamily: "Inter, sans-serif" }}>
          #{String(s.seat_number).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5">
        <p className="text-base font-medium">
          {filled ? (s.profile?.display_name || s.profile?.username) : <span className="text-muted-foreground italic">Seat awaits</span>}
        </p>
        {filled && <FounderBadge tier={s.profile?.join_era === "genesis" ? "genesis" : "founder"} size={11} />}
      </div>
      {s.founder_title && filled && (
        <p className="text-[11px] uppercase tracking-[0.25em] text-aura/80 mt-1">{s.founder_title}</p>
      )}
      {s.council_role && filled && (
        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize" style={{ fontFamily: "Inter, sans-serif" }}>{s.council_role}</p>
      )}
    </div>
  );
  return filled && s.profile ? (
    <Link to={`/founders/${s.profile.username}`}>{inner}</Link>
  ) : (
    <div>{inner}</div>
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
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-3 w-3 rounded-full bg-aura shadow-[0_0_18px_hsl(48_100%_60%/0.8)]" />
    </div>
  </div>
);

export default HallOfFoundersScreen;
