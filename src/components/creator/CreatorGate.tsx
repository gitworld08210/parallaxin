import { ReactNode, useState } from "react";
import { useIsCreator } from "@/hooks/useIsCreator";
import { BecomeCreatorSheet } from "./BecomeCreatorSheet";
import { Sparkles, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export const CreatorGate = ({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) => {
  const { isCreator, loading } = useIsCreator();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isCreator) return <>{children}</>;

  return (
    <div className="min-h-screen pb-24 px-5 pt-10">
      <div className="max-w-md mx-auto rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-aura/10 p-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/20 grid place-items-center">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold">{title || "Creator-only feature"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {subtitle || "Become a Creator to unlock publishing, monetization and analytics."}
        </p>
        <button
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-aura text-primary-foreground font-semibold text-sm shadow-glow"
        >
          <Sparkles className="h-4 w-4" /> Become a Creator
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          85% creator · 15% platform. Read the <Link to="/creator/terms" className="text-primary underline">Creator Agreement</Link>.
        </p>
      </div>
      <BecomeCreatorSheet open={open} onOpenChange={setOpen} />
    </div>
  );
};
