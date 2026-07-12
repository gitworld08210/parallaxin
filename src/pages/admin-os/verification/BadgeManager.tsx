import { useState } from "react";
import { useVerBadges, useRevokeBadge } from "@/hooks/admin-os/useVerification";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const BadgeManager = () => {
  const { data: badges = [] } = useVerBadges();
  const revoke = useRevokeBadge();
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  return (
    <Card><CardContent className="p-0 divide-y">
      {badges.length === 0 && <div className="p-6 text-sm text-muted-foreground">No badges issued.</div>}
      {badges.map(b => (
        <div key={b.id} className="flex items-center justify-between p-4 gap-3">
          <div>
            <div className="font-medium">{b.verification_id}</div>
            <div className="text-xs text-muted-foreground">
              {b.badge_kind} · issued {new Date(b.issued_at).toLocaleDateString()}
              {b.expires_at ? ` · expires ${new Date(b.expires_at).toLocaleDateString()}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{b.status}</Badge>
            {b.status !== "revoked" && (
              <Dialog open={target === b.id} onOpenChange={(o) => setTarget(o ? b.id : null)}>
                <DialogTrigger asChild><Button size="sm" variant="outline">Revoke</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Revoke {b.verification_id}</DialogTitle></DialogHeader>
                  <Textarea placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <DialogFooter>
                    <Button variant="destructive"
                      onClick={() => revoke.mutate({ id: b.id, reason }, { onSuccess: () => { setTarget(null); setReason(""); } })}
                    >Confirm revoke</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      ))}
    </CardContent></Card>
  );
};

export default BadgeManager;
