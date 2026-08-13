import { supabase } from "@/integrations/supabase/client";
/**
 * Skeleton that matches PostCard dimensions exactly — no layout shift on load.
 */
export const PostCardSkeleton = () => (
  <article className="bg-background animate-pulse">
    <header className="flex items-center gap-3 px-3 py-2.5">
      <div className="h-8 w-8 rounded-full bg-muted" />
      <div className="h-3 w-24 rounded bg-muted" />
    </header>
    <div className="w-full aspect-square bg-muted" />
    <div className="flex items-center gap-1 px-3 pt-3 pb-2">
      <div className="h-6 w-6 rounded bg-muted" />
      <div className="h-6 w-6 rounded bg-muted ml-2" />
      <div className="h-6 w-6 rounded bg-muted ml-2" />
      <div className="h-6 w-6 rounded bg-muted ml-auto" />
    </div>
    <div className="h-3 w-20 rounded bg-muted mx-3 mt-1" />
    <div className="h-3 w-2/3 rounded bg-muted mx-3 mt-2" />
    <div className="h-3 w-1/3 rounded bg-muted mx-3 mt-2 mb-5" />
  </article>
);

export const FeedSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="divide-y divide-border">
    {Array.from({ length: count }).map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
);
