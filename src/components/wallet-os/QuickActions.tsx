import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Coins, Gift, Banknote, ScanLine, HandCoins, History, Trophy, MoreHorizontal,
} from "lucide-react";

const ACTIONS = [
  { id: "buy", label: "Buy Aura", icon: Coins, to: "/wallet?buy=1" },
  { id: "gift", label: "Gift Aura", icon: Gift, to: "/wallet/gift" },
  { id: "withdraw", label: "Withdraw", icon: Banknote, to: "/wallet/withdraw" },
  { id: "scan", label: "Scan QR", icon: ScanLine, to: "/wallet/qr" },
  { id: "request", label: "Request", icon: HandCoins, to: "/wallet/qr?mode=request" },
  { id: "history", label: "History", icon: History, to: "/wallet/transactions" },
  { id: "rewards", label: "Rewards", icon: Trophy, to: "/wallet/coins" },
  { id: "more", label: "More", icon: MoreHorizontal, to: "/wallet/passport" },
];

export function QuickActions({ compact = false }: { compact?: boolean }) {
  const list = compact ? ACTIONS.slice(0, 4) : ACTIONS;
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {list.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 * i, type: "spring", stiffness: 260, damping: 22 }}
          whileTap={{ scale: 0.94 }}
        >
          <Link
            to={a.to}
            className="wallet-os-action flex h-[74px] flex-col items-center justify-center gap-1.5"
          >
            <a.icon className="h-[18px] w-[18px] text-[hsl(var(--wallet-accent))]" />
            <span className="text-[10px] font-medium text-foreground/80">{a.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
