import { Link } from "react-router-dom";
import { ImageIcon, Film, Sparkles, Radio, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const Tile = ({ to, icon: Icon, label, sub, gradient, onPick }: any) => (
  <Link
    to={to}
    onClick={onPick}
    className={cn(
      "relative rounded-3xl p-5 flex flex-col justify-between h-40 text-white overflow-hidden active:scale-[0.98] transition-transform bg-gradient-to-br",
      gradient
    )}
  >
    <Icon className="h-7 w-7" strokeWidth={2} />
    <div>
      <p className="text-lg font-bold leading-tight">{label}</p>
      <p className="text-[11px] opacity-80 mt-0.5">{sub}</p>
    </div>
  </Link>
);

export const CreateSheet = ({ open, onOpenChange }: Props) => {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="liquid-glass rounded-b-none border-t border-border/50 rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-w-md mx-auto">
        <div className="flex items-center justify-between pt-1 pb-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Create</p>
            <h2 className="text-2xl font-bold">What's on your mind?</h2>
          </div>
          <button onClick={close} className="h-10 w-10 grid place-items-center rounded-full bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Tile to="/compose" onPick={close} icon={ImageIcon} label="Post" sub="Photo, carousel, text" gradient="from-fuchsia-500 to-pink-600" />
          <Tile to="/compose/reel" onPick={close} icon={Film} label="Reel" sub="Short vertical video" gradient="from-indigo-500 to-purple-600" />
          <Tile to="/compose/story" onPick={close} icon={Sparkles} label="Story" sub="Vanishes in 24h" gradient="from-amber-500 to-orange-600" />
          <Tile to="/live/host" onPick={close} icon={Radio} label="Go Live" sub="Free · Paid · Tips" gradient="from-red-500 to-rose-600" />
        </div>
        <p className="text-[11px] text-center text-muted-foreground mt-4">
          Paid Live: charge a ticket, keep it subscriber-only, or accept gifts from viewers.
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default CreateSheet;
