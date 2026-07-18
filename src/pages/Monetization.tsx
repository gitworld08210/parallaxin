import { PageHeader } from "@/components/layout/PageHeader";
import { CreatorEarnings } from "@/components/wallet/CreatorEarnings";
import { PayoutHistory } from "@/components/wallet/PayoutHistory";
import { CreatorSubscriptionSettings } from "@/components/creator/CreatorSubscriptionSettings";
import { useIsCreator } from "@/hooks/useIsCreator";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Monetization() {
  const { isCreator, loading } = useIsCreator();

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Monetization" />
      <div className="p-4 space-y-5">
        {loading ? null : !isCreator ? (
          <div className="rounded-2xl border border-border bg-card/40 p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Become a creator to unlock monetization.</p>
            <Link to="/wallet"><Button>Go to Wallet</Button></Link>
          </div>
        ) : (
          <>
            <CreatorEarnings />
            <PayoutHistory />
            <CreatorSubscriptionSettings />
          </>
        )}
      </div>
    </div>
  );
}
