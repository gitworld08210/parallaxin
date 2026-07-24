import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, Sparkles, Infinity as InfinityIcon, ShoppingBag, ChevronRight, Zap, Palette, Trophy, ShieldCheck, Wand2, Users } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

const tiers = [
  {
    id: "aura+",
    name: "Aura+",
    tagline: "Essentials, elevated.",
    price: "10,000",
    priceUnit: "XP",
    perks: [
      "Premium profile visuals",
      "Animated profile aura",
      "Earn Aura Coins faster",
      "Priority discovery boost",
    ],
    cta: "Unlock with XP",
    accent: "from-slate-300 via-slate-100 to-white",
    ring: "ring-slate-200/40",
    Icon: Sparkles,
  },
  {
    id: "pro",
    name: "Aura Pro",
    tagline: "For creators who ship.",
    price: "5,000",
    priceUnit: "Aura Coins",
    highlight: true,
    perks: [
      "AI image generation · 8/day",
      "Advanced creator tools",
      "Reduced ads experience",
      "Advanced profile effects",
    ],
    cta: "Get Aura Pro",
    accent: "from-amber-200 via-yellow-100 to-orange-100",
    ring: "ring-amber-300/40",
    Icon: Crown,
  },
  {
    id: "infinity",
    name: "Aura Infinity",
    tagline: "The pinnacle. By invitation.",
    price: "25,000",
    priceUnit: "Aura + Invite",
    perks: [
      "Cinematic elite UI theming",
      "AI generation · 25/day",
      "Ad-free forever",
      "Elite aura visuals & effects",
      "Founder council access",
    ],
    cta: "Ascend to Infinity",
    accent: "from-violet-300 via-fuchsia-200 to-sky-200",
    ring: "ring-violet-300/40",
    Icon: InfinityIcon,
  },
];

const features = [
  { Icon: Wand2, title: "Generative AI", desc: "Create images, edits, and remixes right inside your feed." },
  { Icon: Palette, title: "Living Aura", desc: "Signature profile visuals that respond to your activity." },
  { Icon: Zap, title: "Faster earnings", desc: "Multipliers on XP and Aura Coins across every action." },
  { Icon: Trophy, title: "Priority reach", desc: "Boosted discovery so more people meet your work." },
  { Icon: ShieldCheck, title: "Verified support", desc: "Priority help from a real human. Fast." },
  { Icon: Users, title: "Founder circle", desc: "Direct line to shape what we build next." },
];

const Premium = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div className="bg-black text-white">
      <TopBar subtitle="Membership" title="Aura Universe" />

      {/* HERO — Apple product-page cinematic */}
      <section ref={heroRef} className="relative overflow-hidden pt-6 pb-16 px-5">
        <motion.div
          style={{ y: orbY, scale: orbScale }}
          className="absolute inset-x-0 top-2 mx-auto h-[420px] w-[420px] max-w-[95vw] rounded-full blur-3xl opacity-70 pointer-events-none"
        >
          <div className="h-full w-full rounded-full bg-[conic-gradient(from_180deg,#a78bfa,#f472b6,#fbbf24,#60a5fa,#a78bfa)]" />
        </motion.div>

        <motion.div style={{ y: titleY }} className="relative text-center pt-16">
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/50 mb-3">Introducing</p>
          <h1 className="font-display text-[52px] leading-[0.95] tracking-[-0.03em] font-semibold">
            Aura<span className="italic font-normal text-white/70"> Pro</span>
          </h1>
          <p className="mt-4 text-[17px] leading-snug text-white/70 max-w-[320px] mx-auto">
            The most expressive way to create, connect, and be seen.
          </p>

          <div className="mt-8 flex items-center justify-center gap-2">
            <button className="h-11 px-5 rounded-full bg-white text-black text-[14px] font-semibold active:scale-95 transition">
              Get Aura Pro
            </button>
            <Link
              to="/store"
              className="h-11 px-5 rounded-full border border-white/15 text-[14px] font-semibold text-white/90 inline-flex items-center gap-1 active:scale-95 transition"
              aria-label="Explore the Aurelix Store"
            >
              Explore the Store <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-white/40">Powered by the Aura economy · No fiat required.</p>
        </motion.div>

        {/* Floating device-like feature card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-14 mx-auto max-w-[340px]"
        >
          <div className="rounded-[32px] p-[1px] bg-gradient-to-b from-white/25 via-white/10 to-transparent">
            <div className="rounded-[31px] bg-neutral-950/80 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/50">Today · Aura</span>
                <Crown className="h-4 w-4 text-amber-300" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-display text-[64px] leading-none font-semibold tracking-tight">2.4×</span>
                <span className="pb-2 text-white/60 text-sm">earnings</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "78%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-gradient-to-r from-amber-300 to-fuchsia-400"
                />
              </div>
              <p className="mt-3 text-[12px] text-white/50">You're 22% away from your next Aura milestone.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FEATURES — Apple bento */}
      <section className="px-5 pb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="font-display text-[34px] leading-[1.05] tracking-tight font-semibold text-center mb-2"
        >
          Everything you love.<br />
          <span className="text-white/50">Turned up.</span>
        </motion.h2>
        <p className="text-center text-[15px] text-white/60 mb-8 max-w-[300px] mx-auto">
          Six upgrades that make every scroll, post, and DM feel richer.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-3xl bg-neutral-900/60 border border-white/5 p-5 aspect-[4/5] flex flex-col"
            >
              <div className="h-10 w-10 rounded-2xl bg-white/5 grid place-items-center mb-auto">
                <f.Icon className="h-5 w-5 text-white/85" />
              </div>
              <h3 className="mt-4 font-display text-[19px] leading-tight tracking-tight font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-snug text-white/60">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TIER PICKER — Apple compare */}
      <section className="px-5 pb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="font-display text-[34px] leading-[1.05] tracking-tight font-semibold text-center mb-2"
        >
          Choose your Aura.
        </motion.h2>
        <p className="text-center text-[15px] text-white/60 mb-8">Three tiers. One economy.</p>

        <div className="space-y-3">
          {tiers.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-3xl overflow-hidden border ${
                t.highlight ? "border-white/20" : "border-white/5"
              } bg-neutral-950`}
            >
              {t.highlight && (
                <div className="absolute top-4 right-4 z-10 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white text-black font-semibold">
                  Most popular
                </div>
              )}
              <div className={`absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30 bg-gradient-to-br ${t.accent}`} />

              <div className="relative p-6">
                <div className={`h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br ${t.accent} ${t.ring} ring-1`}>
                  <t.Icon className="h-6 w-6 text-black" />
                </div>

                <h3 className="mt-5 font-display text-[26px] font-semibold tracking-tight">{t.name}</h3>
                <p className="text-[13px] text-white/55">{t.tagline}</p>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-[32px] font-semibold tracking-tight">{t.price}</span>
                  <span className="text-[13px] text-white/50">{t.priceUnit}</span>
                </div>

                <ul className="mt-5 space-y-2">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-white/85">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-white/60" strokeWidth={2.25} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-6 w-full h-11 rounded-full text-[14px] font-semibold active:scale-[0.98] transition ${
                    t.highlight
                      ? "bg-white text-black"
                      : "bg-white/8 text-white border border-white/12 backdrop-blur"
                  }`}
                >
                  {t.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* STORE STRIP */}
      <section className="px-5 pb-16">
        <Link
          to="/store"
          className="block rounded-3xl border border-white/8 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5"
        >
          <div className="flex items-center gap-4">
            <span className="h-12 w-12 rounded-2xl bg-white text-black grid place-items-center">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Aura Store</p>
              <p className="font-display text-[18px] font-semibold tracking-tight">Coin packs & real-money bundles</p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/50" />
          </div>
        </Link>
        <p className="mt-6 text-center text-[11px] text-white/40 leading-relaxed">
          Aura Universe is powered by an in-app economy.<br />
          No fiat required to reach any tier.
        </p>
      </section>
    </div>
  );
};

export default Premium;
