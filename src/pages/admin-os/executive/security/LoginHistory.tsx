import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History } from "lucide-react";
import { useLoginEvents } from "@/hooks/admin-os/useExecutiveSecurity";

const LoginHistory = () => {
  const { data: events = [] } = useLoginEvents();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");

  const filtered = events.filter((e: any) => {
    if (type !== "all" && e.event_type !== type) return false;
    if (q) {
      const s = q.toLowerCase();
      if (![e.event_type, e.ip, e.user_agent].filter(Boolean).some((f: string) => f.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const types = Array.from(new Set(events.map((e: any) => e.event_type)));

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Login History</h2>
          <p className="text-xs text-muted-foreground">Immutable, append-only record of every executive authentication event.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search IP, user agent, event..." className="max-w-sm" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {types.map((t: any) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No login events.
          </div>
        )}
        {filtered.map((e: any) => (
          <div key={e.id} className="flex items-center justify-between border-b border-border/40 py-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant={e.outcome === "success" ? "secondary" : "destructive"} className="text-[10px]">
                {e.outcome}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{e.event_type}</Badge>
              <span className="text-xs text-muted-foreground truncate">
                {e.ip ?? "unknown IP"} · {(e.user_agent ?? "").slice(0, 60)}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {new Date(e.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LoginHistory;
