import { supabase } from "@/integrations/supabase/client";
// MemberList — paginated, real-data members list with search, loading,
// empty, and error states. All data flows through useOrganizationMembers.
import { useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOrganizationMembers } from "@/hooks/organization/useOrganizationMembers";

import MemberCard from "./MemberCard";

const PAGE_SIZE = 12;

export const MemberList = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { members, total, hasMore, loading, fetching, error } = useOrganizationMembers({
    page,
    pageSize: PAGE_SIZE,
    search,
  });

  const showingRange = useMemo(() => {
    if (total === 0) return "0";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min(total, page * PAGE_SIZE + members.length);
    return `${start}-${end} of ${total}`;
  }, [page, total, members.length]);

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
        <h3 className="text-lg font-semibold text-destructive">Couldn't load members</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search members"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {loading ? "Loading members…" : `Showing ${showingRange}`}
        </span>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-900">
            {search ? "No members match your search" : "No members yet"}
          </h3>
          <p className="mt-2 text-slate-500">
            {search
              ? "Try a different name or username."
              : "Invite your first teammate to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0 || fetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {fetching && <Loader2 className="h-3 w-3 animate-spin" />}
          Page {page + 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || fetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default MemberList;
