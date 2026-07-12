import { useKipConversations, useTogglePinConversation } from "@/hooks/admin-os/useKip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageSquare, Pin, PinOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ConversationHistory() {
  const { data: conversations = [] } = useKipConversations();
  const pinMut = useTogglePinConversation();

  const sorted = [...conversations].sort((a, b) => (Number(b.is_pinned) - Number(a.is_pinned)));

  return (
    <div className="space-y-2">
      {sorted.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No conversations yet.</CardContent></Card>
      ) : (
        sorted.map((c) => (
          <Card key={c.id} className="hover:border-primary/40">
            <CardContent className="p-3 flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Link to={`/admin-os/executive/knowledge/chat?c=${c.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {c.last_message_at ? `Last active ${formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}` : "Not started"}
                </p>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => pinMut.mutate({ id: c.id, pinned: !c.is_pinned })}>
                {c.is_pinned ? <Pin className="h-4 w-4 text-primary" /> : <PinOff className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
