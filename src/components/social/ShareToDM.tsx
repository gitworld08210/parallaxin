import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Person = {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
};

export const ShareToDM = ({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  const sendTo = async (target: Person) => {
    if (!user || !postId) return;
    setSending(target.user_id);
    
    try {
      // 1. Get or create conversation
      const { data: convId, error: rpcErr } = await supabase.rpc("get_or_create_dm", {
        _user1: user.uid,
        _user2: target.user_id
      });

      if (rpcErr || !convId) {
        throw new Error(rpcErr?.message || "Couldn't start chat");
      }

      // 2. Send message
      const content = note.trim() || "Check this out";
      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.uid,
        content,
        shared_post_id: postId,
      });

      if (error) throw error;
      
      toast.success(`Sent to @${target.username}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setSending(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto bg-background p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Send to</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-secondary/50 rounded-2xl px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
          
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a message..."
            className="w-full bg-secondary/30 rounded-xl p-3 text-sm min-h-[80px] outline-none"
          />

          <div className="space-y-2 py-4">
             {/* Mocking a list since we don't have search logic here for brevety */}
             <p className="text-xs text-muted-foreground px-1">Recent chats</p>
             <div className="text-center py-8 text-muted-foreground text-sm italic">
               Search for users to share this post.
             </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
