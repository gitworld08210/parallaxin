import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Copy, ShieldCheck, Nfc, AlertTriangle, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WalletOverview } from "@/hooks/useWalletOS";
import type { WalletCardState } from "@/hooks/useWalletCard";
import { CARD_THEMES, CARD_TYPE_LABEL, fmtDate } from "./cardThemes";
import { WalletBadges } from "./WalletBadges";

const nf = new Intl.NumberFormat("en-IN");

export function WalletCard({ wallet, card }: { wallet: WalletOverview; card?: WalletCardState | null }) {
  const [flipped, setFlipped] = useState(false);
  const [qr, setQr] = useState("");
  const host = useRef<HTMLDivElement>(null);

  const skin = CARD_THEMES[card?.card.theme ?? "standard"];
  const typeLabel = CARD_TYPE_LABEL[card?.card.card_type ?? "standard"];
  const needsRefresh = card?.card.security_status === "refresh_recommended";

  // Live tilt: pointer on desktop, device orientation on mobile.
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 140, damping: 18 });
  const sry = useSpring(ry, { stiffness: 140, damping: 18 });
  const sheenX = useTransform(sry, [-12, 12], ["18%", "82%"]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      rx.set(Math.max(-10, Math.min(10, -((e.beta ?? 0) - 40) / 4)));
      ry.set(Math.max(-12, Math.min(12, (e.gamma ?? 0) / 3)));
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [rx, ry]);

  const onPointer = (e: React.PointerEvent) => {
    const el = host.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 18);
    rx.set(-(((e.clientY - r.top) / r.height - 0.5) * 12));
  };
  const resetTilt = () => { rx.set(0); ry.set(0); };

  useEffect(() => {
    const stamp = card ? `?v=${card.card.version}&t=${Date.parse(card.card.issued_at)}` : "";
    QRCode.toDataURL(`https://parallaxai.in/w/${wallet.handle}${stamp}`, {
      margin: 1, width: 320, color: { dark: "#050505", light: "#ffffff" },
    }).then(setQr).catch(() => {});
  }, [wallet.handle, card?.card.version, card?.card.issued_at]);

  const copy = (v: string, what: string) => { navigator.clipboard.writeText(v); toast.success(`${what} copied`); };

  const face = "absolute inset-0 overflow-hidden rounded-[26px] p-5 [backface-visibility:hidden]";
  const faceStyle = {
    backgroundImage: `${skin.glow}, ${skin.surface}`,
    boxShadow: `0 30px 60px -24px rgba(0,0,0,0.85), inset 0 1px 0 ${skin.edge}, inset 0 0 0 1px rgba(255,255,255,0.06)`,
  } as React.CSSProperties;

  return (
    <div className="space-y-3">
      <div ref={host} className="[perspective:1600px]" onPointerMove={onPointer} onPointerLeave={resetTilt}>
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={`${typeLabel} card, version ${card?.card.version ?? 1}. Activate to flip.`}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped((f) => !f)}
          initial={{ opacity: 0, y: 26, scale: 0.94, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{ rotateX: srx, rotateY: sry }}
          className="relative aspect-[1.586/1] w-full cursor-pointer [transform-style:preserve-3d]"
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 170, damping: 24 }}
            className="absolute inset-0 [transform-style:preserve-3d]"
          >
            {/* FRONT */}
            <div className={face} style={faceStyle}>
              <Sheen x={sheenX} gradient={skin.sheen} finish={skin.finish} />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/80">Aurelix</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: skin.accent }}>
                      <ShieldCheck className="h-3 w-3" /> {typeLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/35">Version</p>
                    <p className="text-sm font-semibold" style={{ color: skin.accent }}>V{card?.card.version ?? 1}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.24em] text-white/40">Aura balance</p>
                  <p className="text-[30px] font-semibold leading-none tracking-tight text-white">
                    {nf.format(wallet.total)} <span className="text-sm font-medium text-white/45">AURA</span>
                  </p>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[13px] tracking-[0.16em] text-white/90">{wallet.wallet_id}</p>
                    <p className="truncate text-[11px] text-white/45">@{wallet.handle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Nfc className="h-4 w-4 text-white/35" />
                    <span className="h-7 w-10 rounded-[6px] border border-white/25"
                      style={{ backgroundImage: "linear-gradient(135deg,#d9c98a,#8d7c46 45%,#efe4b6 70%,#7c6c3c)" }} aria-hidden />
                  </div>
                </div>
              </div>
            </div>

            {/* BACK */}
            <div className={cn(face, "[transform:rotateY(180deg)]")} style={faceStyle}>
              <Sheen x={sheenX} gradient={skin.sheen} finish={skin.finish} />
              <div className="relative flex h-full gap-4">
                <div className="grid h-fit place-items-center rounded-xl bg-white p-2 shadow-lg">
                  {qr ? <img src={qr} alt={`Dynamic payment QR for wallet ${wallet.handle}`} className="h-[86px] w-[86px]" /> : <div className="h-[86px] w-[86px]" />}
                </div>
                <dl className="flex-1 space-y-1 text-[10.5px]">
                  <Row label="Security" value={card?.card.security_status === "secure" ? "Secure" : card?.card.security_status === "refresh_recommended" ? "Refresh recommended" : "Review recommended"} accent={skin.accent} />
                  <Row label="Encryption" value={card?.card.encryption ?? "AES-256-GCM"} />
                  <Row label="Wallet created" value={fmtDate(wallet.created_at)} />
                  <Row label="Issued" value={card ? fmtDate(card.card.issued_at) : "—"} />
                  <Row label="Refresh by" value={card ? fmtDate(card.card.refresh_due_at) : "—"} />
                  <Row label="Trust score" value={`${wallet.trust_score}/100`} accent={skin.accent} />
                  <Row label="Version" value={`V${card?.card.version ?? 1}`} />
                  <Row label="Support" value="support@parallaxai.in" />
                </dl>
              </div>
              <p className="absolute inset-x-5 bottom-3 flex items-center gap-1 text-[9px] text-white/35">
                <LifeBuoy className="h-2.5 w-2.5" /> Wallet ID and balance never change when the card is refreshed.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {card && card.badges.length > 0 && <WalletBadges badges={card.badges} />}

      {needsRefresh && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          A newer card generation is available. Refreshing keeps everything — only the card is regenerated.
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <button onClick={() => copy(wallet.wallet_id, "Wallet ID")} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <span className="font-mono">{wallet.wallet_id}</span><Copy className="h-3 w-3" />
        </button>
        <button onClick={() => copy(`@${wallet.handle}`, "Wallet handle")} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          @{wallet.handle}<Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Sheen({ x, gradient, finish }: { x: any; gradient: string; finish: string }) {
  return (
    <>
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 opacity-70"
        style={{ backgroundImage: gradient, backgroundSize: "220% 100%", backgroundPositionX: x }} />
      {finish === "carbon" && (
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)" }} />
      )}
      {finish === "glass" && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 opacity-30"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)" }} />
      )}
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-white/40">{label}</dt>
      <dd className="truncate text-white/85" style={accent ? { color: accent } : undefined}>{value}</dd>
    </div>
  );
}
