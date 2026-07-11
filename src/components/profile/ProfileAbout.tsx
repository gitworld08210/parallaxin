import { Calendar, Globe, MapPin, Briefcase, Sparkles, Trophy } from "lucide-react";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  bio?: string | null;
  profession?: string | null;
  location?: string | null;
  website?: string | null;
  joinedAt?: string | null;
  auraRank?: string | null;
  contributionScore?: number | null;
  tier?: string | null;
  interests?: string[] | null;
  className?: string;
}

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null;

export const ProfileAbout = ({
  bio,
  profession,
  location,
  website,
  joinedAt,
  auraRank,
  contributionScore,
  tier,
  interests,
  className,
}: Props) => {
  return (
    <section className={cn("space-y-4 py-6", className)} aria-label="About">
      {bio && (
        <Card>
          <SectionLabel>Bio</SectionLabel>
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{bio}</p>
        </Card>
      )}

      <Card>
        <SectionLabel>Details</SectionLabel>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          {profession && <DlRow icon={Briefcase} term="Profession" desc={profession} />}
          {location && <DlRow icon={MapPin} term="Location" desc={location} />}
          {website && (
            <DlRow
              icon={Globe}
              term="Website"
              desc={
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary hover:underline"
                >
                  {website.replace(/^https?:\/\//, "")}
                </a>
              }
            />
          )}
          {joinedAt && <DlRow icon={Calendar} term="Joined" desc={formatDate(joinedAt)!} />}
          {tier && <DlRow icon={Sparkles} term="Tier" desc={<span className="capitalize">{tier}</span>} />}
          {auraRank && <DlRow icon={Trophy} term="Aura rank" desc={auraRank} />}
          {typeof contributionScore === "number" && contributionScore > 0 && (
            <DlRow icon={Trophy} term="Contribution" desc={fmt(contributionScore)} />
          )}
          {!profession && !location && !website && !joinedAt && !tier && !auraRank && !contributionScore && (
            <p className="text-sm text-muted-foreground">No additional details yet.</p>
          )}
        </dl>
      </Card>

      {interests && interests.length > 0 && (
        <Card>
          <SectionLabel>Interests</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-secondary text-foreground/90 border border-border px-2.5 py-1 text-xs"
              >
                {i}
              </span>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
};

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5">{children}</div>
);
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
    {children}
  </p>
);
const DlRow = ({
  icon: Icon,
  term,
  desc,
}: {
  icon: typeof Calendar;
  term: string;
  desc: React.ReactNode;
}) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 grid place-items-center h-7 w-7 rounded-lg bg-secondary text-muted-foreground shrink-0">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </span>
    <div className="min-w-0 flex-1 flex items-center justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{term}</dt>
      <dd className="text-sm font-medium text-foreground text-right truncate">{desc}</dd>
    </div>
  </div>
);

export default ProfileAbout;
