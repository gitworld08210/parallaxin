import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import { Copy, ShieldCheck, Wifi } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WalletOverview } from "@/hooks/useWalletOS";

const nf = new Intl.NumberFormat("en-IN");

export function WalletCard({ wallet }: { wallet: WalletOverview }) {
  const [flipped, setFlipped] = useState(false);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(`aurelix://wallet/${wallet.handle}`, {
      margin: 1, width: 320, color: { dark: "#050505", light: "#ffffff" },
    }).then(setQr).catch(() => {});
  }, [wallet.handle]);

  const copy = (v: string, what: string) => {
    navigator.clipboard.writeText(v);
    toast.success(`${what} copied`);
  };

  const total = wallet.total;

  return (
    <div className="[perspective:1600px]">
      <motion.div
        role="button"
        tabIndex={0}
        aria-label="Aurelix wallet card, tap to flip"
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped((f) => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
        className="relative aspect-[1.586/1] w-full cursor-pointer [transform-style:preserve-3d]"
      >
        {/* FRONT */}
        <div className="wallet-os-card absolute inset-0 flex flex-col justify-between p-5 [backface-visibility:hidden]">
          <div className="flex items-start justify-between">
            <div>
              <p className="wallet-os-brand">AURELIX WALLET</p>
              {wallet.status === "active" && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--wallet-accent))]">
                  <ShieldCheck className="h-3 w-3" /> Verified Wallet
                </span>
              )}
            </div>
            <Wifi className="h-5 w-5 rotate-90 text-white/40" />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Aura balance</p>
            <p className="wallet-os-amount">{nf.format(total)} <span className="text-base font-medium text-white/50">AURA</span></p>
            <p className="text-xs text-white/45">≈ ₹{nf.format(total)}</p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[13px] tracking-[0.14em] text-white/85">{wallet.wallet_id}</p>
              <p className="truncate text-[11px] text-white/45">@{wallet.handle}</p>
            </div>
            <span className="wallet-os-chip" aria-hidden />
          </div>
        </div>

        {/* BACK */}
        <div className="wallet-os-card absolute inset-0 flex gap-4 p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="grid h-fit place-items-center rounded-xl bg-white p-2">
            {qr ? <img src={qr} alt={`QR code for wallet ${wallet.handle}`} className="h-24 w-24" /> : <div className="h-24 w-24" />}
          </div>
          <dl className="flex-1 space-y-1.5 text-[11px]">
            <Row label="Wallet ID" value={wallet.wallet_id} mono />
            <Row label="Created" value={new Date(wallet.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
            <Row label="Status" value={wallet.status} accent />
            <Row label="Security" value={`${wallet.security_score}/100`} accent />
            <Row label="Version" value={wallet.version} />
          </dl>
        </div>
      </motion.div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
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

function Row({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-white/40">{label}</dt>
      <dd className={cn("truncate text-white/85", mono && "font-mono", accent && "capitalize text-[hsl(var(--wallet-accent))]")}>{value}</dd>
    </div>
  );
}
