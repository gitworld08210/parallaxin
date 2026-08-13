import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, FolderPlus, Check, Bookmark } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

type Collection = { id: string; name: string };

export const SaveToCollectionSheet = ({
  postId, open, onOpenChange,
}: { postId: string; open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [inSet, setInSet] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
        supabase.select("id, name").eq("user_id", user.id).order("created_at", { ascending: false }) as any);
      setCollections((cs ?? []) as Collection[]);
        supabase.select("collection_id").eq("post_id", postId) as any);
      setInSet(new Set((items ?? []).map((i: any) => i.collection_id)));
    })();
  }, [open, user?.id, postId]);

  const toggle = async (cid: string) => {
    if (!user) return;
    const is = inSet.has(cid);
    const next = new Set(inSet);
    if (is) {
      next.delete(cid); setInSet(next);
    } else {
      next.add(cid); setInSet(next);
      // also ensure it's saved
      if (error) { const x = new Set(next); x.delete(cid); setInSet(x); toast.error(error.message); }
    }
  };

  const createCollection = async () => {
    if (!user || !newName.trim()) return;
      .insert({ user_id: user.id, name: newName.trim() } as any).select("id, name").maybeSingle() as any);
    if (error || !data) { toast.error(error?.message || "Failed"); return; }
    setCollections((c) => [data as Collection, ...c]);
    setNewName(""); setCreating(false);
    toggle((data as Collection).id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl p-0 max-h-[70vh] flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-base font-semibold text-foreground text-left flex items-center gap-2">
            <Bookmark className="h-4 w-4" /> Save to collection
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-border text-sm active:bg-secondary"
            >
              <div className="h-10 w-10 rounded-md bg-muted grid place-items-center"><FolderPlus className="h-5 w-5 text-foreground" /></div>
              New collection
              <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
            </button>
          ) : (
            <div className="px-4 py-3 border-b border-border flex gap-2">
              <input
                autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                className="flex-1 bg-muted rounded-md px-3 py-2 text-sm outline-none"
              />
              <button onClick={createCollection} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
            </div>
          )}
          {collections.length === 0 && !creating && (
            <p className="text-sm text-muted-foreground text-center py-10">No collections yet.</p>
          )}
          <ul>
            {collections.map((c) => {
              const saved = inSet.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => toggle(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-border text-sm active:bg-secondary"
                  >
                    <div className="h-10 w-10 rounded-md bg-muted grid place-items-center">
                      <Bookmark className={`h-5 w-5 ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
                    </div>
                    <span className="flex-1 text-left truncate">{c.name}</span>
                    {saved && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
};
