import { useState } from "react";
import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Check, Crown, Sparkles, Coins, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const SUBS = [
  {
    priceId: "aurelix_premium_monthly",
    name: "Aurelix Premium",
    tagline: "₹499 / month",
    icon: Sparkles,
    gradient: "bg-gradient-primary",
    glow: "shadow-glow",
    perks: ["Premium badge", "Ad-free experience", "Larger uploads", "Priority discovery"],
    tier: "premium" as const,
  },
  {
    priceId: "aurelix_pro_monthly",
    name: "Aurelix Pro",
    tagline: "₹999 / month",
    icon: Crown,
    gradient: "bg-gradient-gold",
    glow: "shadow-gold",
    perks: ["Everything in Premium", "Creator analytics", "Scheduled posts", "More AI generations"],
    tier: "pro" as const,
  },
];

const COIN_PACKS = [
  { priceId: "aura_coins_1000_onetime", coins: 1000, price: "₹399" },
  { priceId: "aura_coins_5000_onetime", coins: 5000, price: "₹1,499", badge: "Popular" },
  { priceId: "aura_coins_12000_onetime", coins: 12000, price: "₹2,999", badge: "Best value" },
];

const Store = () => {
  const { user } = useAuth();
  const { openCheckout, closeCheckout, isOpen, checkoutElement } = useStripeCheckout();
  const { tier, subscription } = useSubscription(user?.id);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleBuy = (priceId: string) => {
    if (!user) { toast.error("Please sign in first"); return; }
    openCheckout({ priceId, customerEmail: user.email, userId: user.id });
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: `${window.location.origin}/store`, environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url as string, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div>
      <PaymentTestModeBanner />
      <TopBar subtitle="Upgrade with real money" title="Store" />

      <div className="px-5 space-y-6 pb-8">
        {/* Subscription manager */}
        {subscription && (
          <GlassCard className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Active plan</p>
              <p className="font-semibold capitalize">{tier}</p>
              {subscription.cancel_at_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cancels on {new Date(subscription.current_period_end!).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {portalLoading ? "Opening…" : "Manage"} <ExternalLink className="h-3 w-3" />
            </button>
          </GlassCard>
        )}

        {/* Subscriptions */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Subscriptions</h2>
          {SUBS.map((s) => {
            const isCurrent = tier === s.tier;
            return (
              <GlassCard key={s.priceId} className="relative overflow-hidden p-0">
                <div className={`absolute inset-0 opacity-30 ${s.gradient}`} />
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`h-12 w-12 rounded-2xl grid place-items-center ${s.gradient} ${s.glow}`}>
                      <s.icon className="h-6 w-6 text-primary-foreground" />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.tagline}</p>
                      <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {s.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => isCurrent ? openPortal() : handleBuy(s.priceId)}
                    className={`w-full text-sm font-semibold px-4 py-3 rounded-full text-primary-foreground ${s.gradient} ${s.glow}`}
                  >
                    {isCurrent ? "Current plan · Manage" : tier !== "free" ? `Switch to ${s.name}` : `Subscribe to ${s.name}`}
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </section>

        {/* Coin packs */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-400" /> Aura Coin Packs
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {COIN_PACKS.map((p) => (
              <GlassCard key={p.priceId} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{p.coins.toLocaleString()} Aura Coins</p>
                  {p.badge && <p className="text-[10px] uppercase tracking-wider text-primary mt-0.5">{p.badge}</p>}
                </div>
                <button
                  onClick={() => handleBuy(p.priceId)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-full bg-gradient-gold text-primary-foreground shadow-gold"
                >
                  Buy · {p.price}
                </button>
              </GlassCard>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Secure payments by Stripe · Cancel anytime
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={(o) => !o && closeCheckout()}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {checkoutElement}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Store;
