import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useSearch } from "@/hooks/platform/usePlatform";

const GlobalSearch = () => {
  const [q, setQ] = useState("");
  const { data: results = [], isFetching } = useSearch(q);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Global Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search across every object you can access. Permissions enforced server-side.
        </p>
      </header>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employees, docs, approvals, workflows…"
          className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-sm"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!isFetching && q.length > 1 && results.length === 0 && (
          <p className="text-sm text-muted-foreground">No results.</p>
        )}
        {results.map((r) => (
          <div
            key={`${r.object_type}:${r.object_id}`}
            className="rounded-lg border border-border/60 bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{r.title}</p>
              <span className="text-[10px] uppercase text-muted-foreground">
                {r.object_type}
              </span>
            </div>
            {r.body && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {r.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default GlobalSearch;
