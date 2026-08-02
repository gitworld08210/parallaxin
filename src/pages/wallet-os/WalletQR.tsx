import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WalletShell } from "@/components/wallet-os/WalletShell";
import { useWalletOS } from "@/hooks/useWalletOS";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WalletQR() {
  const { wallet, loading } = useWalletOS();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [src, setSrc] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  const payload = wallet
    ? `aurelix://pay?to=${wallet.handle}${amount ? `&amount=${amount}` : ""}${note ? `&note=${encodeURIComponent(note)}` : ""}`
    : "";

  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, { width: 640, margin: 1, color: { dark: "#0b0b0f", light: "#ffffff" } }).then(setSrc);
  }, [payload]);

  const copy = () => { navigator.clipboard.writeText(payload); toast.success("Payment link copied"); };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "Aurelix Wallet", text: `Send me Aura @${wallet?.handle}`, url: payload });
    else copy();
  };

  return (
    <WalletShell title="Receive Aura" subtitle="Share your wallet QR" back>
      {loading || !wallet ? (
        <div className="grid place-items-center py-24 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          <div className="wallet-os-tile grid place-items-center gap-3 p-6">
            <div className="rounded-3xl bg-white p-4 shadow-lg">
              {src ? <img src={src} alt={`Payment QR code for wallet ${wallet.handle}`} className="h-56 w-56" /> : <div className="h-56 w-56" />}
            </div>
            <p className="text-base font-semibold">@{wallet.handle}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{wallet.wallet_id}</p>
            <canvas ref={canvas} className="hidden" />
          </div>

          <div className="wallet-os-tile space-y-3 p-4">
            <div className="space-y-1.5">
              <label htmlFor="qr-amt" className="text-[10px] uppercase tracking-wider text-muted-foreground">Request amount (optional)</label>
              <Input id="qr-amt" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="qr-note" className="text-[10px] uppercase tracking-wider text-muted-foreground">Note (optional)</label>
              <Input id="qr-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is this for?" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1 gap-2" onClick={copy}><Copy className="h-4 w-4" /> Copy link</Button>
            <Button className="h-11 flex-1 gap-2" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
          </div>
        </div>
      )}
    </WalletShell>
  );
}
