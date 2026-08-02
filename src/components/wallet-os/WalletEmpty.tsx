import { LucideIcon } from "lucide-react";

export function WalletEmpty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="wallet-os-tile grid place-items-center gap-2 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--wallet-accent)/0.12)]">
        <Icon className="h-6 w-6 text-[hsl(var(--wallet-accent))]" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-[26ch] text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
