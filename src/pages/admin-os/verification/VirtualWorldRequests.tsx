/**
 * Admin OS · Verification — Virtual World access requests.
 *
 * Staff review Aadhaar KYC submissions and approve or decline access to the
 * shared company calling / messaging number.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe2, Loader2, CheckCircle2, XCircle, FileImage } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TABS = ["pending", "approved", "rejected"] as const;

const VirtualWorldRequests = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vw-requests", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_world_applications")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("vw_decide_application", {
        _application_id: id,
        _approve: approve,
        _note: notes[id]?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["vw-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save decision"),
  });

  const openDoc = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage
      .from("virtual-world-kyc")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Could not open document");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold">Virtual World access requests</h2>
      </div>

      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
              tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          No {tab} requests.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r: any) => (
            <li key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-semibold">{r.full_name}</p>
                <span className="text-xs text-muted-foreground">Aadhaar ****{String(r.aadhaar_number).slice(-4)}</span>
                <span className="text-xs text-muted-foreground">{r.contact_phone}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.purpose}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["Aadhaar front", r.aadhaar_front_path],
                  ["Aadhaar back", r.aadhaar_back_path],
                  ["Selfie", r.selfie_path],
                ]
                  .filter(([, p]) => !!p)
                  .map(([label, p]) => (
                    <Button key={label as string} size="sm" variant="outline" onClick={() => openDoc(p as string)}>
                      <FileImage className="mr-1.5 h-3.5 w-3.5" />
                      {label as string}
                    </Button>
                  ))}
              </div>

              {tab === "pending" ? (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Decision note (optional)"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide.mutate({ id: r.id, approve: true })} disabled={decide.isPending}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: r.id, approve: false })} disabled={decide.isPending}>
                      <XCircle className="mr-1.5 h-4 w-4" /> Decline
                    </Button>
                  </div>
                </div>
              ) : r.review_note ? (
                <p className="mt-3 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">{r.review_note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VirtualWorldRequests;
