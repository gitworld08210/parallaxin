import { useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreatorSubscription } from "@/hooks/useCreatorSubscription";
import { SubscribeSheet } from "./SubscribeSheet";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface Props { creatorId: string; creatorName: string; className?: string; }

export function SubscribeButton({ creatorId, creatorName, className }: Props) {
  const { settings, subscription, isSubscribed, loading, refresh } = useCreatorSubscription(creatorId);
  const [open, setOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  if (loading || !settings || !settings.enabled) return null;

  const cancel = async () => {
    setCanceling(true);
    const { error } = await supabase.rpc("cancel_creator_subscription" as never, {
      _creator_id: creatorId,
    } as never);
    setCanceling(false);
    if (error) return toast.error(error.message);
    toast.success("Auto-renew off — access ends on period end");
    refresh();
  };

  if (isSubscribed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 transition",
              className,
            )}>
            <Check className="h-4 w-4" /> Subscribed
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-2 text-xs">
            <p className="text-muted-foreground">Renews on</p>
            <p className="font-semibold">{new Date(subscription!.current_period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            {subscription!.cancel_at_period_end && <p className="text-amber-400 mt-1">Auto-renew off</p>}
          </div>
          {!subscription!.cancel_at_period_end && (
            <DropdownMenuItem onClick={cancel} className="text-destructive focus:text-destructive" disabled={canceling}>
              {canceling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Turn off auto-renew
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold bg-gradient-to-r from-fuchsia-500 via-pink-500 to-red-500 text-white shadow-md hover:brightness-110 active:scale-95 transition",
          className,
        )}>
        <Sparkles className="h-4 w-4" /> Subscribe
      </button>
      <SubscribeSheet
        open={open}
        onOpenChange={setOpen}
        creatorId={creatorId}
        creatorName={creatorName}
        settings={settings}
        onSubscribed={refresh}
      />
    </>
  );
}
