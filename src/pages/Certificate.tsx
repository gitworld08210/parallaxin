import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Fingerprint,
  CalendarDays,
  FileText,
  UserRound,
  Crown,
  Lock,
  Hexagon,
  Bitcoin,
} from "lucide-react";
import { toast } from "sonner";

interface Cert {
  id: string;
  post_id: string;
  creator_id: string;
  content_hash: string;
  media_url: string;
  media_type: string;
  ots_status: string;
  ots_confirmed_at: string | null;
  bitcoin_block_height: number | null;
  created_at: string;
  profile?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
}

/* ----- design tokens (scoped to this page) ----- */
const NAVY = "#0B1E3F";
const NAVY_DEEP = "#071630";
const GOLD = "#C9A24B";
const GOLD_LIGHT = "#E8C97A";
const CREAM = "#FBF6EC";
const PAPER = "#FFFDF7";
const INK = "#0F1A33";

const SerifTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif" }} className={className}>
    {children}
  </span>
);

const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-3 px-5 py-3 rounded-t-2xl" style={{ background: NAVY }}>
    <div
      className="h-9 w-9 rounded-full grid place-items-center shrink-0"
      style={{ background: GOLD, color: NAVY, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.25)" }}
    >
      {icon}
    </div>
    <SerifTitle className="tracking-[0.18em] text-[13px] font-semibold uppercase" >
      <span style={{ color: CREAM }}>{label}</span>
    </SerifTitle>
  </div>
);

const Certificate = () => {
  const { postId } = useParams();
  const [cert, setCert] = useState<Cert | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => { /* shimmed action */ })();
  }, [postId]);

  const verifyUrl = useMemo(() => {
    if (!cert) return "";
    return `${window.location.origin}/certificate/${cert.post_id}`;
  }, [cert]);

  const qrSrc = useMemo(() => {
    if (!verifyUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&qzone=1&data=${encodeURIComponent(verifyUrl)}`;
  }, [verifyUrl]);

  const certNumber = useMemo(() => {
    if (!cert) return "";
    const year = new Date(cert.created_at).getFullYear();
    const tail = cert.id.replace(/\D/g, "").slice(-6).padStart(6, "0");
    return `AUR-${year}-${tail}`;
  }, [cert]);

  const copyHash = async () => {
    if (!cert) return;
    await navigator.clipboard.writeText(cert.content_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadPdf = () => {
    if (!cert) return;
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ownership-pdf?id=${cert.id}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!cert) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-display text-xl font-bold">No certificate found</h1>
          <p className="text-sm text-muted-foreground mt-1">This post hasn't been certified.</p>
          <Link to="/" className="text-sm text-primary mt-4 inline-block">Back to Aurelix</Link>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(cert.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hashShort = `${cert.content_hash.slice(0, 8)}…${cert.content_hash.slice(-8)}`;
  const isAnchored = cert.ots_status === "confirmed" || !!cert.bitcoin_block_height;

  return (
    <div className="min-h-screen py-6 px-3 sm:py-10 sm:px-6" style={{ background: "linear-gradient(180deg,#0a1228,#111a36)" }}>
      {/* Google font for serif title */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Dancing+Script:wght@500;700&display=swap"
        rel="stylesheet"
      />

      {/* Action bar */}
      <div className="max-w-[860px] mx-auto mb-4 flex items-center justify-between gap-2 text-white/80">
        <Link to="/" className="text-xs underline-offset-2 hover:underline">← Back</Link>
        <div className="flex gap-2">
          <button
            onClick={downloadPdf}
            className="text-xs px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          <Link
            to={`/p/${cert.post_id}`}
            className="text-xs px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Post
          </Link>
        </div>
      </div>

      {/* CERTIFICATE PAPER */}
      <article
        className="relative max-w-[860px] mx-auto shadow-2xl"
        style={{
          background: PAPER,
          color: INK,
          padding: "28px",
          borderRadius: 6,
          backgroundImage:
            "radial-gradient(circle at 20% 10%, rgba(201,162,75,0.07), transparent 40%), radial-gradient(circle at 80% 90%, rgba(11,30,63,0.05), transparent 40%)",
        }}
      >
        {/* Ornate navy border */}
        <div
          className="absolute inset-3 pointer-events-none rounded-[4px]"
          style={{
            border: `3px solid ${NAVY}`,
            boxShadow: `inset 0 0 0 6px ${PAPER}, inset 0 0 0 7px ${GOLD}`,
          }}
        />
        {/* Gold corner flourishes */}
        {[
          { top: 6, left: 6, rot: 0 },
          { top: 6, right: 6, rot: 90 },
          { bottom: 6, right: 6, rot: 180 },
          { bottom: 6, left: 6, rot: 270 },
        ].map((c, i) => (
          <svg
            key={i}
            width="46"
            height="46"
            viewBox="0 0 46 46"
            className="absolute"
            style={{ ...c, transform: `rotate(${c.rot}deg)` } as any}
          >
            <path
              d="M2 18 Q2 2 18 2 M6 14 Q22 14 22 22 M2 26 Q14 26 14 14"
              fill="none"
              stroke={GOLD}
              strokeWidth="1.4"
            />
            <circle cx="22" cy="22" r="2" fill={GOLD} />
          </svg>
        ))}

        {/* Ribbon top-right */}
        <div className="absolute top-0 right-8 z-10" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" }}>
          <svg width="78" height="120" viewBox="0 0 78 120">
            <defs>
              <linearGradient id="rb" x1="0" x2="1">
                <stop offset="0" stopColor={GOLD_LIGHT} />
                <stop offset="0.5" stopColor={GOLD} />
                <stop offset="1" stopColor="#9a7a30" />
              </linearGradient>
            </defs>
            <path d="M0 0 H78 V100 L39 84 L0 100 Z" fill="url(#rb)" />
            <path d="M0 0 H78 V6 H0 Z" fill={NAVY} opacity="0.15" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center pt-3 text-center" style={{ color: NAVY }}>
            <Crown className="h-4 w-4 mb-1" />
            <div className="text-[8px] font-bold leading-tight tracking-wider">
              VERIFIED &<br />BLOCKCHAIN<br />SECURED
            </div>
            <div className="text-[10px] mt-1 tracking-[0.3em]">★★★</div>
          </div>
        </div>

        {/* HEADER */}
        <header className="relative pt-4 pb-3 text-center">
          {/* Shield emblem */}
          <div className="relative inline-block mb-2">
            <svg width="120" height="86" viewBox="0 0 120 86">
              {/* laurel left */}
              <g stroke={GOLD} strokeWidth="1.4" fill="none">
                <path d="M20 60 Q12 40 20 18" />
                <path d="M22 54 Q16 52 14 46" />
                <path d="M22 46 Q16 44 14 38" />
                <path d="M22 38 Q16 36 14 30" />
                <path d="M22 30 Q16 28 14 22" />
                {/* laurel right (mirror) */}
                <path d="M100 60 Q108 40 100 18" />
                <path d="M98 54 Q104 52 106 46" />
                <path d="M98 46 Q104 44 106 38" />
                <path d="M98 38 Q104 36 106 30" />
                <path d="M98 30 Q104 28 106 22" />
              </g>
              {/* shield */}
              <path d="M60 6 L92 14 V44 Q92 66 60 80 Q28 66 28 44 V14 Z" fill={NAVY} stroke={GOLD} strokeWidth="1.5" />
              <text
                x="60"
                y="52"
                textAnchor="middle"
                fontSize="34"
                fontWeight="700"
                fill={GOLD}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                A
              </text>
            </svg>
          </div>

          <SerifTitle className="block text-[34px] sm:text-[40px] font-bold tracking-[0.18em] leading-none" >
            <span style={{ color: NAVY }}>AURELIX</span>
          </SerifTitle>
          <div className="mt-1.5 text-[10px] tracking-[0.35em] font-semibold" style={{ color: GOLD }}>
            TRUSTED CREATOR PROOF
          </div>

          <h1 className="mt-5 px-2">
            <SerifTitle className="block text-[26px] sm:text-[38px] font-bold leading-tight">
              <span style={{ color: NAVY }}>C</span>
              <span style={{ color: NAVY, fontSize: "0.78em" }}>ONTENT </span>
              <span style={{ color: NAVY }}>O</span>
              <span style={{ color: NAVY, fontSize: "0.78em" }}>WNERSHIP </span>
              <span style={{ color: NAVY }}>C</span>
              <span style={{ color: NAVY, fontSize: "0.78em" }}>ERTIFICATE</span>
            </SerifTitle>
          </h1>

          {/* divider with ornament */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="h-px w-16" style={{ background: GOLD }} />
            <svg width="20" height="10" viewBox="0 0 20 10"><path d="M0 5 Q10 -3 20 5 Q10 13 0 5 Z" fill={GOLD} /></svg>
            <span className="h-px w-16" style={{ background: GOLD }} />
          </div>

          <p className="mt-2 text-[11px] sm:text-[13px] tracking-[0.4em] font-semibold" style={{ color: NAVY, opacity: 0.7 }}>
            PROOF OF EXISTENCE &amp; OWNERSHIP
          </p>
        </header>

        {/* HERO ROW: media + meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4 px-2">
          {/* Media frame */}
          <div
            className="relative rounded-md overflow-hidden self-start"
            style={{
              border: `2px solid ${GOLD}`,
              boxShadow: `inset 0 0 0 4px ${PAPER}, inset 0 0 0 5px ${NAVY}, 0 6px 18px rgba(0,0,0,0.12)`,
              aspectRatio: "4 / 3",
            }}
          >
            {cert.media_type === "video" ? (
              <video src={cert.media_url} controls className="w-full h-full object-cover" />
            ) : (
              <img src={cert.media_url} alt="Certified content" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Meta list */}
          <div className="space-y-4">
            <MetaRow
              icon={<FileText className="h-5 w-5" />}
              label="CERTIFICATE ID"
              value={certNumber}
              valueClass="font-bold text-[18px]"
            />
            <Divider />
            <MetaRow
              icon={<CalendarDays className="h-5 w-5" />}
              label="ISSUED ON"
              value={issuedDate}
              valueClass="font-bold text-[18px]"
            />
            <Divider />
            <MetaRow
              icon={<ShieldCheck className="h-5 w-5" />}
              label="STATUS"
              valueNode={
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-wide text-[18px]" style={{ color: "#1f8a4c" }}>
                    VERIFIED
                  </span>
                  <span className="h-5 w-5 rounded-full grid place-items-center" style={{ background: "#1f8a4c" }}>
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                </div>
              }
            />
          </div>
        </div>

        {/* TWO INFO CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 px-2">
          {/* Creator card */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: NAVY }}>
            <SectionHeader icon={<UserRound className="h-5 w-5" />} label="Creator Information" />
            <div className="relative px-5 py-5" style={{ background: "linear-gradient(180deg,#fffdf6,#f7eed8)" }}>
              {/* watermark shield */}
              <svg className="absolute right-3 bottom-2 opacity-10" width="120" height="120" viewBox="0 0 120 120">
                <path d="M60 10 L100 22 V58 Q100 92 60 110 Q20 92 20 58 V22 Z" fill={NAVY} />
                <text x="60" y="74" textAnchor="middle" fontSize="48" fontWeight="700" fill={GOLD} style={{ fontFamily: "'Cormorant Garamond', serif" }}>A</text>
              </svg>
              <div className="relative">
                <div className="text-[11px] tracking-wide text-slate-500">Creator Name</div>
                <div className="font-bold text-[18px]" style={{ color: NAVY }}>
                  {cert.profile?.display_name ?? cert.profile?.username ?? "Aurelix Creator"}
                </div>
                <div className="my-3 border-t border-dashed" style={{ borderColor: GOLD }} />
                <div className="text-[11px] tracking-wide text-slate-500">Username</div>
                <div className="font-semibold text-[16px]" style={{ color: NAVY }}>
                  @{cert.profile?.username ?? "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Content card */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: NAVY }}>
            <SectionHeader icon={<FileText className="h-5 w-5" />} label="Content Information" />
            <div className="relative px-5 py-5" style={{ background: "linear-gradient(180deg,#fffdf6,#f7eed8)" }}>
              {/* watermark blockchain */}
              <svg className="absolute right-3 bottom-2 opacity-10" width="120" height="120" viewBox="0 0 120 120" fill="none" stroke={NAVY} strokeWidth="2">
                <rect x="20" y="20" width="30" height="30" />
                <rect x="55" y="20" width="30" height="30" />
                <rect x="37" y="60" width="30" height="30" />
                <line x1="35" y1="50" x2="45" y2="60" />
                <line x1="70" y1="50" x2="60" y2="60" />
              </svg>
              <div className="relative space-y-3">
                <div>
                  <div className="text-[11px] tracking-wide text-slate-500">Media Type</div>
                  <div className="font-bold text-[16px] capitalize" style={{ color: NAVY }}>{cert.media_type}</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-wide text-slate-500">Content Hash (SHA-256)</div>
                  <button
                    onClick={copyHash}
                    className="font-mono font-bold text-[15px] inline-flex items-center gap-2"
                    style={{ color: NAVY }}
                    title="Copy full hash"
                  >
                    {hashShort}
                    {copied ? <Check className="h-4 w-4" style={{ color: "#1f8a4c" }} /> : <Fingerprint className="h-4 w-4" style={{ color: GOLD }} />}
                  </button>
                </div>
                <div>
                  <div className="text-[11px] tracking-wide text-slate-500">Blockchain Proof</div>
                  <div className="font-bold text-[16px]" style={{ color: NAVY }}>OpenTimestamps</div>
                </div>
                <div>
                  <div className="text-[11px] tracking-wide text-slate-500">Proof Status</div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tracking-wide text-[15px]" style={{ color: isAnchored ? "#1f8a4c" : "#b8860b" }}>
                      {isAnchored ? "ANCHORED" : cert.ots_status.toUpperCase()}
                    </span>
                    {isAnchored && (
                      <span className="h-4 w-4 rounded-full grid place-items-center" style={{ background: "#1f8a4c" }}>
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VERIFICATION strip */}
        <div
          className="mt-6 mx-2 rounded-2xl p-4 grid grid-cols-[auto_1fr_auto] items-center gap-4"
          style={{ background: "linear-gradient(180deg,#fffdf6,#f7eed8)", border: `1.5px solid ${GOLD}` }}
        >
          {/* shield lock */}
          <div className="h-16 w-14 grid place-items-center rounded-md" style={{ background: NAVY }}>
            <Lock className="h-6 w-6" style={{ color: GOLD }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-[10px]" style={{ color: GOLD }}>❦</span>
              <SerifTitle className="text-[20px] font-bold" >
                <span style={{ color: NAVY }}>Verification</span>
              </SerifTitle>
              <span className="text-[10px]" style={{ color: GOLD }}>❦</span>
            </div>
            <div className="text-[12px]" style={{ color: NAVY, opacity: 0.85 }}>Scan the QR code or visit:</div>
            <a href={verifyUrl} className="block truncate font-semibold text-[13px]" style={{ color: "#1e40af" }}>
              {verifyUrl}
            </a>
          </div>
          <div className="p-1.5 rounded-md bg-white" style={{ border: `1px solid ${NAVY}` }}>
            {qrSrc && <img src={qrSrc} alt="Verification QR" width={92} height={92} />}
          </div>
        </div>

        {/* TWO NOTICE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 px-2">
          <div className="rounded-2xl border p-4" style={{ borderColor: "#cfd6e0", background: "#fbfaf4" }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: "#1f8a4c" }}>
              <ShieldCheck className="h-5 w-5" />
              <span className="font-bold tracking-wider text-[12px]">WHAT THIS CERTIFICATE PROVES</span>
            </div>
            <ul className="space-y-2 text-[12.5px] leading-snug" style={{ color: INK }}>
              {[
                "The content previewed above existed on the Aurelix platform at the stated issuance date.",
                "A cryptographic fingerprint of this content has been recorded and independently timestamped.",
                "The ownership claim can be verified through the Aurelix verification portal.",
              ].map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0" style={{ background: "#1f8a4c" }}>
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "#cfd6e0", background: "#fbfaf4" }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: "#b91c1c" }}>
              <ShieldCheck className="h-5 w-5" />
              <span className="font-bold tracking-wider text-[12px]">IMPORTANT NOTICE</span>
            </div>
            <p className="text-[12.5px] leading-snug" style={{ color: INK }}>
              This certificate is evidence of content existence and ownership claims on the Aurelix platform.
              It does not replace official copyright registration with government authorities.
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-6 px-2 grid grid-cols-1 sm:grid-cols-3 items-end gap-4">
          {/* gold seal */}
          <div className="flex justify-center sm:justify-start">
            <div className="relative h-24 w-24">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${GOLD_LIGHT}, ${GOLD} 55%, #8a6b22)`,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                }}
              />
              <div
                className="absolute inset-1.5 rounded-full grid place-items-center"
                style={{ border: `2px dashed ${NAVY_DEEP}`, color: NAVY_DEEP }}
              >
                <div className="text-center leading-tight">
                  <SerifTitle className="block text-[10px] font-bold tracking-wider">AURELIX</SerifTitle>
                  <SerifTitle className="block text-[26px] font-bold leading-none">A</SerifTitle>
                  <div className="text-[7px] tracking-[0.2em] font-bold">TRUST &amp; SAFETY</div>
                </div>
              </div>
            </div>
          </div>

          {/* signature */}
          <div className="text-center">
            <div
              style={{ fontFamily: "'Dancing Script', cursive", color: NAVY, fontSize: 36, lineHeight: 1 }}
            >
              Aurelix Team
            </div>
            <div className="mt-1 h-px mx-auto w-3/4" style={{ background: NAVY, opacity: 0.5 }} />
            <div className="mt-1 text-[11px] tracking-[0.25em] font-bold" style={{ color: NAVY }}>
              AURELIX TRUST &amp; SAFETY
            </div>
            <div className="text-[10px] italic" style={{ color: NAVY, opacity: 0.7 }}>
              Securing Creators. Building Trust.
            </div>
          </div>

          {/* powered/secured */}
          <div className="rounded-xl border p-3 space-y-2 text-[11px]" style={{ borderColor: "#cfd6e0", background: "#fbfaf4" }}>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md grid place-items-center" style={{ background: NAVY }}>
                <Hexagon className="h-4 w-4" style={{ color: GOLD }} />
              </div>
              <div>
                <div className="tracking-[0.2em] text-slate-500">POWERED BY</div>
                <div className="font-bold" style={{ color: NAVY }}>OpenTimestamps</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md grid place-items-center" style={{ background: "#f7931a" }}>
                <Bitcoin className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="tracking-[0.2em] text-slate-500">SECURED BY</div>
                <div className="font-bold" style={{ color: NAVY }}>Bitcoin Blockchain</div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-3" />
      </article>

      <p className="max-w-[860px] mx-auto mt-4 text-center text-[11px] text-white/50">
        Aurelix · Verifiable proof of timestamp · Independent verification at openTimestamps.org
      </p>
    </div>
  );
};

/* ---------- helpers ---------- */
const Divider = () => (
  <div className="h-px w-full" style={{ background: `repeating-linear-gradient(90deg, ${GOLD} 0 6px, transparent 6px 12px)` }} />
);

const MetaRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  valueClass?: string;
}> = ({ icon, label, value, valueNode, valueClass = "" }) => (
  <div className="flex items-start gap-3">
    <div
      className="h-11 w-11 shrink-0 rounded-full grid place-items-center"
      style={{ background: NAVY, color: GOLD, boxShadow: `inset 0 0 0 2px ${GOLD}` }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] tracking-[0.25em] font-semibold" style={{ color: NAVY, opacity: 0.6 }}>
        {label}
      </div>
      {valueNode ?? <div className={`font-bold ${valueClass}`} style={{ color: NAVY }}>{value}</div>}
    </div>
  </div>
);

export default Certificate;
