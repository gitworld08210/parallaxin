import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { AuraFrame } from "@/components/founders/AuraFrame";
import { FounderBadge } from "@/components/founders/FounderBadge";
import { initialsOf } from "@/lib/format";

type FounderProfile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  founder_title: string | null;
  aura_rank: string | null;
  join_era: string | null;
  council_role: string | null;
  chronicle: string | null;
  signature_aura: string | null;
};

type Work = { id: string; media_url: string | null; media_type: string | null; content: string };

const FounderChronicle = () => {
  const { username } = useParams();
  const [p, setP] = useState<FounderProfile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url, bio, founder_title, aura_rank, join_era, council_role, chronicle, signature_aura").eq("username", username).maybeSingle();
      setP(data as FounderProfile | null);
      if (data) {
        const { data: ws } = await supabase.from("posts").select("id, media_url, media_type, content").eq("user_id", (data as any).user_id).eq("status", "published").order("like_count", { ascending: false }).limit(3);
        setWorks((ws ?? []) as Work[]);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <div className="p-12 text-center text-sm text-muted-foreground">Opening chronicle…</div>;
  if (!p) return <div className="p-12 text-center text-sm text-muted-foreground">Not found.</div>;

  const tier: "genesis" | "council" | "founder" = p.join_era === "genesis" ? "genesis" : p.council_role ? "council" : "founder";

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Cormorant Garamond', 'Times New Roman', serif" }}>
      <header className="h-14 px-3 flex items-center sticky top-0 bg-background/80 backdrop-blur z-10">
        <Link to="/hall-of-founders" className="p-1" aria-label="Back"><ChevronLeft className="h-6 w-6" /></Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-6 pb-12 text-center">
        <div aria-hidden className="absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(55% 45% at 50% 25%, hsl(48 100% 60% / 0.22), transparent 70%)" }} />
        <div aria-hidden className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(35% 25% at 50% 70%, hsl(265 80% 65% / 0.18), transparent 70%)" }} />
        <div className="relative inline-block">
          <AuraFrame src={p.avatar_url ?? undefined} size={132} tier={tier} initials={initialsOf(p.display_name || p.username)} />
        </div>
        <p className="relative mt-6 text-[10px] uppercase tracking-[0.5em] text-aura/80">
          {p.join_era === "genesis" ? "Genesis Era · MMXXVI" : "Founder · Aurelix"}
        </p>
        <div className="relative mt-2 inline-flex items-center gap-2">
          <h1 className="text-3xl font-light tracking-wide">{p.display_name || p.username}</h1>
          <FounderBadge tier={tier} size={16} />
        </div>
        <p className="relative text-sm text-muted-foreground mt-1" style={{ fontFamily: "Inter, sans-serif" }}>@{p.username}</p>
        {p.founder_title && (
          <p className="relative mt-4 text-[11px] uppercase tracking-[0.35em] text-aura/90">{p.founder_title}</p>
        )}
        {p.aura_rank && (
          <p className="relative mt-1 text-sm text-foreground/80 italic">{p.aura_rank}</p>
        )}
      </section>

      {/* Chronicle prose */}
      <section className="px-8 py-10 max-w-xl mx-auto border-t border-border/40">
        <p className="text-[10px] uppercase tracking-[0.5em] text-aura/70 text-center">Chronicle</p>
        <p className="mt-6 text-lg leading-relaxed text-foreground/90 italic">
          {p.chronicle || p.bio || "Their chronicle is still being written."}
        </p>
      </section>

      {/* Signature works */}
      {works.length > 0 && (
        <section className="px-4 py-10 border-t border-border/40">
          <p className="text-[10px] uppercase tracking-[0.5em] text-aura/70 text-center">Signature Works</p>
          <div className="mt-6 grid grid-cols-3 gap-1.5">
            {works.map((w) => (
              <Link key={w.id} to={`/p/${w.id}`} className="aspect-square bg-muted overflow-hidden rounded-md">
                {w.media_url ? (
                  w.media_type === "video"
                    ? <video src={w.media_url} muted className="w-full h-full object-cover" />
                    : <img src={w.media_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full p-2 grid place-items-center text-[10px] text-muted-foreground text-center" style={{ fontFamily: "Inter, sans-serif" }}>{w.content?.slice(0, 80)}</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sigil */}
      <section className="px-6 py-12 border-t border-border/40 text-center">
        <Sigil username={p.username} />
        <p className="mt-3 text-[10px] uppercase tracking-[0.4em] text-muted-foreground" style={{ fontFamily: "Inter, sans-serif" }}>Identity Sigil</p>
      </section>

      <div className="text-center pb-16">
        <Link to={`/u/${p.username}`} className="inline-block text-[11px] uppercase tracking-[0.3em] text-foreground border border-border px-5 py-2.5 rounded-full"
          style={{ fontFamily: "Inter, sans-serif" }}>
          View public profile
        </Link>
      </div>
    </div>
  );
};

/** Deterministic sigil generated from username — feels unique per founder. */
const Sigil = ({ username }: { username: string }) => {
  const hash = Array.from(username).reduce((a, c) => a + c.charCodeAt(0), 0);
  const sides = 5 + (hash % 4); // 5..8
  const rot = hash % 360;
  const points = Array.from({ length: sides }, (_, i) => {
    const a = (i * 360) / sides + rot;
    const r = 38 + ((hash + i * 17) % 8);
    const x = 50 + r * Math.cos((a * Math.PI) / 180);
    const y = 50 + r * Math.sin((a * Math.PI) / 180);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 100" width={110} height={110} className="mx-auto opacity-90">
      <defs>
        <linearGradient id="sigGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(48 100% 70%)" />
          <stop offset="100%" stopColor="hsl(28 100% 55%)" />
        </linearGradient>
      </defs>
      <polygon points={points} fill="none" stroke="url(#sigGold)" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="3" fill="url(#sigGold)" />
      {Array.from({ length: sides }).map((_, i) => {
        const a = (i * 360) / sides + rot;
        const x = 50 + 38 * Math.cos((a * Math.PI) / 180);
        const y = 50 + 38 * Math.sin((a * Math.PI) / 180);
        return <line key={i} x1="50" y1="50" x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="hsl(48 100% 70% / 0.35)" strokeWidth="0.3" />;
      })}
    </svg>
  );
};

export default FounderChronicle;
