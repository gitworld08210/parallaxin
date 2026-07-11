import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Crown, Globe, MapPin, Briefcase } from "lucide-react";
import { VerificationBadge } from "@/components/vibe/VerificationBadge";

interface ProfileIdentityProps {
  displayName: string;
  username: string;
  verificationKind?: string | null;
  onVerificationClick?: () => void;
  isFounder?: boolean;
  bio?: string | null;
  profession?: string | null;
  location?: string | null;
  website?: string | null;
  joinedAt?: string | null;
}

const formatJoined = (iso?: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

/**
 * Name + verification + bio + meta (profession, location, website, joined).
 * Everything on the 8px grid.
 */
export const ProfileIdentity = ({
  displayName,
  username,
  verificationKind,
  onVerificationClick,
  isFounder,
  bio,
  profession,
  location,
  website,
  joinedAt,
}: ProfileIdentityProps) => {
  const joined = formatJoined(joinedAt);
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
      aria-labelledby="profile-name"
    >
      <div className="space-y-1">
        <h1
          id="profile-name"
          className="flex items-center gap-2 text-2xl font-bold leading-tight tracking-tight"
        >
          <span className="truncate">{displayName || username}</span>
          {verificationKind && (
            <button
              type="button"
              onClick={onVerificationClick}
              aria-label={`View ${verificationKind} verification details`}
              className="inline-flex items-center rounded-full p-0.5 -m-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:scale-110 active:scale-95"
            >
              <VerificationBadge kind={verificationKind} />
            </button>
          )}
          {isFounder && (
            <Link
              to="/hall-of-founders"
              aria-label="Founder — Hall of Founders"
              className="inline-flex items-center justify-center h-6 w-6 rounded-full text-founder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Crown className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">@{username}</p>
      </div>

      {bio && (
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
          {bio}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {profession && (
          <MetaItem icon={Briefcase}>
            <span>{profession}</span>
          </MetaItem>
        )}
        {location && (
          <MetaItem icon={MapPin}>
            <span>{location}</span>
          </MetaItem>
        )}
        {website && (
          <MetaItem icon={Globe}>
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              {website.replace(/^https?:\/\//, "")}
            </a>
          </MetaItem>
        )}
        {joined && (
          <MetaItem icon={Calendar}>
            <span>Joined {joined}</span>
          </MetaItem>
        )}
      </div>
    </motion.section>
  );
};

const MetaItem = ({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar;
  children: React.ReactNode;
}) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
    {children}
  </span>
);

export default ProfileIdentity;
