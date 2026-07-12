import { useState } from "react";
import { useVerAppeals, useDecideAppeal, type VerStatus } from "@/hooks/admin-os/useVerification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AppealsCenter = () => {
  const { data: appeals = [] } = useVerAppeals();
  const decide = useDecideAppeal();
  const [drafts, setDrafts] = useState<Record<string, { status: VerStatus; notes: string }>>({});

  return (
    <Card><CardContent className="p-0 divide-y">
      {appeals.length === 0 && <div className="p-6 text-sm text-muted-foreground">No appeals filed.</div>}
      {appeals.map(a => {
        const draft = drafts[a.id] ?? { status: "approved" as VerStatus, notes: "" };
        return (
          <div key={a.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{a.reason}</span>
              <Badge variant="outline">{a.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Filed {new Date(a.created_at).toLocaleString()}</p>
            {(a.status === "pending" || a.status === "under_review") && (
              <div className="flex flex-wrap gap-2 items-start pt-2">
                <Select value={draft.status} onValueChange={(v) => setDrafts(d => ({ ...d, [a.id]: { ...draft, status: v as VerStatus } }))}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve appeal</SelectItem>
                    <SelectItem value="rejected">Reject appeal</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea className="flex-1 min-w-[200px]" rows={2} placeholder="Decision notes"
                  value={draft.notes}
                  onChange={(e) => setDrafts(d => ({ ...d, [a.id]: { ...draft, notes: e.target.value } }))} />
                <Button size="sm" disabled={!draft.notes || decide.isPending}
                  onClick={() => decide.mutate({ id: a.id, status: draft.status, notes: draft.notes })}
                >Save</Button>
              </div>
            )}
            {a.decision_notes && <p className="text-xs mt-1">Notes: {a.decision_notes}</p>}
          </div>
        );
      })}
    </CardContent></Card>
  );
};

export default AppealsCenter;
