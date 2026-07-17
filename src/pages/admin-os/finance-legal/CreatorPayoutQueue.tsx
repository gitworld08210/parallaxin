import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatorPayoutRequests, useReviewCreatorPayout } from "@/hooks/admin-os/useFinance";
import { Check, Clock, Landmark, Loader2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const rupees = (cents: number) => `₹${(cents / 100).toLocaleString("en-IN")}`;

const CreatorPayoutQueue = () => {
  const [status, setStatus] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data: rows = [], isLoading } = useCreatorPayoutRequests(status);
  const review = useReviewCreatorPayout();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Creator payout queue</h2>
          <p className="text-sm text-muted-foreground">Auto-routed withdrawal requests from creator wallets.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4 text-primary" /> Finance intake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!isLoading && rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No payout requests in this queue.</p>}
          {rows.map((row) => {
            const detail = (row.payout_detail ?? {}) as Record<string, string>;
            const note = notes[row.id] ?? "";
            const isPending = row.status === "pending";
            return (
              <div key={row.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isPending ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>{row.status}</Badge>
                      <Badge variant="outline">{row.method}</Badge>
                      <Badge variant="outline">{row.routing_status ?? "routed"}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">Creator {row.user_id.slice(0, 8)} · {row.environment}</p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" /> {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{rupees(Number(row.amount_cents) || 0)}</p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{row.currency}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 rounded-md bg-muted/30 p-3 text-xs sm:grid-cols-2">
                  {row.method === "upi" ? <Info label="UPI" value={detail.upi} /> : <><Info label="Account" value={detail.account_number ? `••••${String(detail.account_number).slice(-4)}` : undefined} /><Info label="IFSC" value={detail.ifsc} /></>}
                  <Info label="Assignment" value={row.admin_assignment_id?.slice(0, 8)} />
                  <Info label="Routed" value={row.routed_at ? new Date(row.routed_at).toLocaleString() : "Queued"} />
                </div>

                {row.admin_note && <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{row.admin_note}</p>}

                {isPending && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <Input placeholder="Finance note" value={note} onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))} />
                    <Button variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: "rejected", note })}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                    <Button disabled={review.isPending} onClick={() => review.mutate({ id: row.id, decision: "paid", note })}>
                      <Check className="mr-1 h-4 w-4" /> Mark paid
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    <p className="mt-0.5 font-medium">{value || "—"}</p>
  </div>
);

export default CreatorPayoutQueue;