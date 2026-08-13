import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus, X } from "lucide-react";

/** CreatorSubscriptionSettings - Supabase removed, uses Mock logic. */
export function CreatorSubscriptionSettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [coins, setCoins] = useState<number>(500);
  const [inr, setInr] = useState<number>(199);
  const [perks, setPerks] = useState<string[]>(["Exclusive posts", "Subscriber-only lives", "Priority DMs"]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Data fetching removed.
  }, [user?.id]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Subscription settings saved (Mock)");
    }, 500);
  };

  if (loading) return <div className="py-8 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">Fan subscriptions</p>
          <p className="text-xs text-muted-foreground">Let fans subscribe to your profile for monthly access to exclusive content and lives.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Price (coins/month)</label>
          <Input type="number" min={50} max={100000} value={coins} onChange={(e) => setCoins(Number(e.target.value))} className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Price fallback (₹/month)</label>
          <Input type="number" min={49} value={inr} onChange={(e) => setInr(Number(e.target.value))} className="mt-1" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Perks (max 5)</label>
        <div className="space-y-2 mt-1">
          {perks.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input value={p} onChange={(e) => setPerks(perks.map((v, j) => j === i ? e.target.value : v))} placeholder="e.g. Weekly exclusive reel" />
              <Button variant="ghost" size="icon" onClick={() => setPerks(perks.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          {perks.length < 5 && (
            <Button variant="outline" size="sm" onClick={() => setPerks([...perks, ""])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add perk
            </Button>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Save settings
      </Button>
    </div>
  );
}