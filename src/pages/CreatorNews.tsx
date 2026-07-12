import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { Newspaper, TrendingUp, Sparkles, DollarSign, Users } from "lucide-react";

type Story = {
  category: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  icon: any;
};

const stories: Story[] = [
  {
    category: "Platforms",
    title: "Short-form video revenue splits continue to shift in creators' favor",
    summary:
      "Major platforms are rolling out new revenue-sharing models for short-form video, giving mid-tier creators access to ad payouts that were previously reserved for top accounts.",
    source: "Industry Report",
    date: "This week",
    icon: TrendingUp,
  },
  {
    category: "Monetization",
    title: "Subscription fatigue pushes creators toward tipping and one-off unlocks",
    summary:
      "As audiences reduce monthly subscriptions, creators are seeing higher conversion on pay-per-post unlocks, live tips, and time-limited digital goods.",
    source: "Creator Economy Weekly",
    date: "3 days ago",
    icon: DollarSign,
  },
  {
    category: "AI",
    title: "AI-assisted content workflows become table stakes for full-time creators",
    summary:
      "From thumbnail generation to script drafting, AI tools are compressing production time — freeing creators to publish more consistently across formats.",
    source: "Trends Digest",
    date: "5 days ago",
    icon: Sparkles,
  },
  {
    category: "Community",
    title: "Close-friend and private-audience features drive higher engagement",
    summary:
      "Creators leaning into smaller, curated audiences report stronger DM response rates and higher paid conversion than broad public posting.",
    source: "Platform Insights",
    date: "1 week ago",
    icon: Users,
  },
  {
    category: "Policy",
    title: "New disclosure guidance affects sponsored content across regions",
    summary:
      "Updated advertising standards require clearer sponsorship labels on posts, stories and live streams — creators should audit branded content templates.",
    source: "Regulatory Brief",
    date: "1 week ago",
    icon: Newspaper,
  },
];

export default function CreatorNews() {
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Creator Economy News" />
      <div className="p-4 space-y-5">
        <GlassCard>
          <h1 className="text-2xl font-bold">Creator Economy News</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Curated updates on the creator economy: platform changes, monetization
            trends, AI tools, community strategies, and policy shifts that affect
            how creators earn and grow.
          </p>
        </GlassCard>

        <section aria-label="Latest creator economy stories" className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Latest stories
          </h2>
          {stories.map((s) => (
            <article key={s.title}>
              <GlassCard className="p-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>{s.category}</span>
                      <span aria-hidden>·</span>
                      <span>{s.date}</span>
                    </div>
                    <h3 className="text-lg font-semibold mt-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {s.summary}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Source: {s.source}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </article>
          ))}
        </section>

        <GlassCard>
          <h2 className="text-base font-semibold">About this feed</h2>
          <p className="text-sm text-muted-foreground mt-2">
            The creator economy news feed covers the developments most relevant to
            people building an audience and income online: how platforms pay, what
            formats are working, which tools are shifting workflows, and how
            regulation is evolving. New stories are added regularly.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
