import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Megaphone, ArrowLeft } from "lucide-react";

export default function AdsComingSoon() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <Helmet>
        <title>Aurelix Ads — Coming Soon</title>
        <meta
          name="description"
          content="Aurelix Ads is being rebuilt from the ground up. Campaign, placement and billing tools will return soon."
        />
        <meta property="og:title" content="Aurelix Ads — Coming Soon" />
        <meta
          property="og:description"
          content="Aurelix Ads is being rebuilt from the ground up. Campaign, placement and billing tools will return soon."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Megaphone className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Aurelix Ads</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We&apos;re rebuilding the advertising platform from scratch — campaigns, placements,
          creatives and billing are being redesigned. It will be back shortly.
        </p>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
