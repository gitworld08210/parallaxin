import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Check, Sparkles, Loader2 } from "lucide-react";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { BuyCoinsSheet } from "@/components/wallet/BuyCoinsSheet";
import { SubSettings } from "@/hooks/useCreatorSubscription";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  creatorId: string;
  creatorName: string;
  settings: SubSettings;
  onSubscribed?: () => void;
}

export function SubscribeSheet({ open, onOpenChange, creatorId, creatorName, settings, onSubscribed }: Props) {
  const { balance, refresh } = useCoinBalance();
  const [loading, setLoading] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const enough = balance >= settings.monthly_price_coins;

  const subscribe = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("subscribe_to_creator" as never, {
      _creator_id: creatorId,
    } as never);
    setLoading(false);
    if (error) {
      if (error.message.includes("insufficient")) return toast.error("Not enough coins — top up first");
      return toast.error(error.message);
    }
    toast.success(`Subscribed to @${creatorName} for 30 days`);
    await refresh();
    onSubscribed?.();
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Subscribe to @{creatorName}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-4">
            <div className="rounded-2xl p-5 border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-accent/10 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Monthly</p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Coins className="h-6 w-6 text-aura" />
                <span className="font-display text-4xl font-bold">{settings.monthly_price_coins.toLocaleString("en-IN")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">or ₹{(settings.monthly_price_inr_cents / 100).toLocaleString("en-IN")} · 30 days access</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">What you get</p>
              {(settings.perks ?? []).map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-muted/30 px-4 py-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Your coin balance</span>
              <span className="font-semibold flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-aura" />{balance.toLocaleString("en-IN")}</span>
            </div>

            {enough ? (
              <Button onClick={subscribe} disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Subscribe with {settings.monthly_price_coins.toLocaleString("en-IN")} coins
              </Button>
            ) : (
              <Button onClick={() => setBuyOpen(true)} className="w-full" size="lg" variant="default">
                Top up coins to subscribe
              </Button>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              Renews manually every 30 days. Cancel anytime from the creator's profile.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      <BuyCoinsSheet open={buyOpen} onOpenChange={setBuyOpen} />
    </>
  );
}
