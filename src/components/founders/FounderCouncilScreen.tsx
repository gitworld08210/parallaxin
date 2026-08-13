import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { AuraFrame } from "@/components/founders/AuraFrame";
import { initialsOf } from "@/lib/format";

type Member = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  council_role: string | null;
  founder_title: string | null;
};

const WINGS = [
  { role: "architect", title: "Architects", desc: "They shape what Aurelix becomes.", color: "hsl(48 100% 60%)" },
  { role: "curator",   title: "Curators",   desc: "They preserve and elevate culture.", color: "hsl(265 80% 65%)" },
  { role: "sentinel",  title: "Sentinels",  desc: "They safeguard the civilization.",   color: "hsl(150 70% 55%)" },
  { role: "innovator", title: "Innovators", desc: "They invent its next frontiers.",    color: "hsl(204 100% 60%)" },
];

export const FounderCouncilScreen = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, council_role, founder_title").not("council_role", "is", null).order("created_at", { ascending: true });
      setMembers((data ?? []) as Member[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif" }}>
      <header className="h-14 px-3 flex items-center sticky top-0 bg-background/80 backdrop-blur z-10">
        <Link to="/hall-of-founders" className="p-1" aria-label="Back"><ChevronLeft className="h-6 w-6" /></Link>
      </header>

      <div className="relative px-6 pt-4 pb-10 text-center overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-50"
          style={{ background: "radial-gradient(50% 40% at 50% 0%, hsl(265 80% 60% / 0.18), transparent 70%)" }} />
        <p className="relative text-[10px] uppercase tracking-[0.5em] text-aura/80">Council Chambers</p>
        <h1 className="relative mt-2 text-4xl font-light tracking-wide">Founder Council</h1>
        <p className="relative mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
          The active stewards of Aurelix. Voices on the roadmap, custodians of culture, first to walk through new doors.
        </p>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground py-12">Convening…</p>}

      {WINGS.map((w) => {
        const list = members.filter((m) => m.council_role === w.role);
        return (
          <section key={w.role} className="relative px-4 py-10 border-t border-border/40 overflow-hidden">
            <div aria-hidden className="absolute inset-0 opacity-30 pointer-events-none"
              style={{ background: `radial-gradient(50% 60% at 50% 30%, ${w.color} 0%, transparent 70%)` }} />
            <div className="relative text-center">
              <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: w.color }}>Wing</p>
              <h2 className="mt-2 text-2xl font-light">{w.title}</h2>
              <p className="mt-2 text-xs text-muted-foreground max-w-sm mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>{w.desc}</p>
            </div>
            <Constellation members={list} />
          </section>
        );
      })}

      {/* Future governance preview */}
      <section className="px-6 py-12 border-t border-border/40 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">In Preparation</p>
        <h2 className="mt-2 text-xl font-light">Chambers of Voice</h2>
        <div className="mt-5 grid grid-cols-2 gap-2 max-w-sm mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
          {["Voting", "Roadmap", "Experiments", "Governance"].map((t) => (
            <div key={t} className="rounded-xl border border-border/60 bg-card/50 px-3 py-4 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              {t}
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground/70" style={{ fontFamily: "Inter, sans-serif" }}>Council voice weighs three.</p>
      </section>
    </div>
  );
};

const Constellation = ({ members }: { members: Member[] }) => {
  if (members.length === 0) {
    return <p className="relative text-center text-xs text-muted-foreground mt-8" style={{ fontFamily: "Inter, sans-serif" }}>This wing awaits its first member.</p>;
  }
  return (
    <div className="relative mt-8 grid grid-cols-3 gap-x-2 gap-y-6 justify-items-center">
      {members.map((m, i) => (
        <Link key={m.user_id} to={`/founders/${m.username}`}
          className="flex flex-col items-center text-center"
          style={{ transform: `translateY(${(i % 2) * 12}px)` }}>
          <AuraFrame src={m.avatar_url ?? undefined} size={68} tier="council" initials={initialsOf(m.display_name || m.username)} />
          <p className="mt-2 text-sm font-medium">{m.display_name || m.username}</p>
          {m.founder_title && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-aura/70 mt-0.5">{m.founder_title}</p>
          )}
        </Link>
      ))}
    </div>
  );
};

export default FounderCouncilScreen;
