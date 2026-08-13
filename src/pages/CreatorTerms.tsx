import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";


export default function CreatorTerms() {
  const [split, setSplit] = useState({ creator: 85, platform: 15 });
  const [version, setVersion] = useState("2026-06-13");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings" as any).select("key, value").in("key", ["creator_revenue_split", "creator_terms_version"]);
      for (const row of (data ?? []) as any[]) {
        if (row.key === "creator_revenue_split" && row.value) {
          const v: any = row.value;
          if (typeof v?.creator === "number") setSplit(v);
        }
        if (row.key === "creator_terms_version" && typeof row.value === "string") setVersion(row.value);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Creator Agreement" />
      <article className="px-5 py-4 space-y-4 text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-wider">Version {version}</p>

        <h2 className="text-base font-semibold text-foreground">1. Revenue split</h2>
        <p>
          Aurelix retains <strong>{split.platform}%</strong> of gross revenue from tips, paid unlocks, and other
          monetization features. Creators receive <strong>{split.creator}%</strong> of gross revenue, less any
          payment-processor fees disclosed at the time of transaction.
        </p>

        <h2 className="text-base font-semibold text-foreground">2. Payouts and KYC</h2>
        <p>
          To request a payout you must complete KYC verification and provide a valid UPI ID or bank account.
          Minimum payout thresholds, processing times, and currency conversion rates may apply and are disclosed in
          your Wallet.
        </p>

        <h2 className="text-base font-semibold text-foreground">3. Content ownership and license</h2>
        <p>
          You retain ownership of the content you upload. By posting, you grant Aurelix a non-exclusive, worldwide,
          royalty-free license to host, store, reproduce, display, distribute, and create derivative previews of your
          content solely for the purpose of operating, promoting, and improving the service.
        </p>

        <h2 className="text-base font-semibold text-foreground">4. Prohibited content</h2>
        <p>
          You will not upload content that is illegal, infringes third-party rights, depicts minors in a sexualized
          manner, promotes violence, or violates the Community Guidelines. Violations may result in removal,
          monetization suspension, payout forfeiture, and account termination.
        </p>

        <h2 className="text-base font-semibold text-foreground">5. Refunds</h2>
        <p>
          Tips and unlock revenue are final and non-refundable once verified by Aurelix or the payment network,
          except where required by law.
        </p>

        <h2 className="text-base font-semibold text-foreground">6. Taxes</h2>
        <p>
          You are solely responsible for reporting and paying any taxes, levies, or duties owed on your earnings in
          your jurisdiction. Aurelix may withhold amounts where required by law.
        </p>

        <h2 className="text-base font-semibold text-foreground">7. Age requirement</h2>
        <p>You must be at least 18 years old to enable monetization or receive payouts.</p>

        <h2 className="text-base font-semibold text-foreground">8. Changes</h2>
        <p>
          Aurelix may update this Agreement. We will notify you in-app of material changes. Continued use of creator
          features after the effective date constitutes acceptance.
        </p>

        <h2 className="text-base font-semibold text-foreground">9. Termination</h2>
        <p>
          You may stop publishing at any time. Aurelix may suspend or terminate creator privileges for violations of
          this Agreement or the Community Guidelines.
        </p>
      </article>
    </div>
  );
}
