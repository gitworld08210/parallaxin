import { useKipBookmarks, useRemoveBookmark } from "@/hooks/admin-os/useKip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2 } from "lucide-react";

export default function BookmarksPage() {
  const { data: bookmarks = [] } = useKipBookmarks();
  const rm = useRemoveBookmark();

  return (
    <div className="space-y-2">
      {bookmarks.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No bookmarks. Save important documents, chunks or messages here.</CardContent></Card>
      ) : (
        bookmarks.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <Bookmark className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{b.label ?? b.target_type}</p>
                <p className="text-[10px] text-muted-foreground">{b.target_type} · {b.target_id}</p>
                {b.note && <p className="text-xs text-muted-foreground mt-1">{b.note}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => rm.mutate(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
