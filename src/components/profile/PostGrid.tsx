import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Film, Image as ImageIcon, Pin, PinOff, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/components/social/PostCard";

interface Props {
  posts: FeedPost[];
  isMe?: boolean;
  onTogglePin?: (post: FeedPost) => void;
  aspect?: "square" | "portrait";
  emptyLabel?: string;
}

/**
 * Refined media grid. Rounded tiles, elevated hover, pinned indicator,
 * pin toggle for own profile. Uses reserved aspect boxes to prevent CLS.
 */
export const PostGrid = ({
  posts,
  isMe,
  onTogglePin,
  aspect = "square",
  emptyLabel = "Nothing here yet.",
}: Props) => {
  if (!posts.length) {
    return (
      <p className="col-span-full text-sm text-muted-foreground text-center py-16">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
      {posts.map((p, i) => {
        const pinned = !!(p as any).is_pinned;
        const isVideo = p.media_type === "video";
        const isImage = !!p.media_url && !isVideo;
        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.02 }}
            className={cn(
              "relative overflow-hidden rounded-xl bg-secondary group",
              aspect === "square" ? "aspect-square" : "aspect-[9/16]",
            )}
          >
            <Link
              to={`/p/${p.id}`}
              className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
              aria-label={p.content ? p.content.slice(0, 60) : "Open post"}
            >
              {isVideo ? (
                <video
                  src={p.media_url ?? undefined}
                  muted
                  playsInline
                  className="w-full h-full object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
                />
              ) : isImage ? (
                <img
                  src={p.media_url!}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full grid place-items-center p-3 text-xs text-foreground/80 text-center line-clamp-6">
                  {p.content}
                </div>
              )}
              {/* subtle gradient on hover */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* Type indicator */}
            <div className="absolute top-1.5 right-1.5 grid place-items-center h-6 w-6 rounded-full bg-black/40 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {isVideo ? (
                <Film className="h-3 w-3" />
              ) : isImage ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <Type className="h-3 w-3" />
              )}
            </div>

            {pinned && (
              <div className="absolute top-1.5 left-1.5 rounded-full bg-primary text-primary-foreground p-1 shadow-sm">
                <Pin className="h-3 w-3" strokeWidth={2.5} aria-label="Pinned" />
              </div>
            )}

            {isMe && onTogglePin && (
              <button
                type="button"
                aria-label={pinned ? "Unpin post" : "Pin post"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTogglePin(p);
                }}
                className="absolute bottom-1.5 right-1.5 grid place-items-center h-7 w-7 rounded-full bg-black/50 text-white backdrop-blur opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

/** Skeleton grid matching PostGrid layout. */
export const PostGridSkeleton = ({ count = 9, aspect = "square" }: { count?: number; aspect?: "square" | "portrait" }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "rounded-xl bg-secondary/60 relative overflow-hidden",
          aspect === "square" ? "aspect-square" : "aspect-[9/16]",
        )}
      >
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      </div>
    ))}
  </div>
);

export default PostGrid;
