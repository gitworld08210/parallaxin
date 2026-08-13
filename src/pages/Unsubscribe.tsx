import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type State =
  | { kind: "validating" }
  | { kind: "invalid" }
  | { kind: "already" }
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "validating" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setState({ kind: "invalid" });
        return;
      }
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          return;
        }
      } catch {
        if (!cancelled) setState({ kind: "invalid" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token }
      });
      if (error) throw error;
      if (data?.success) setState({ kind: "done" });
      else if (data?.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: "Something went wrong." });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? "Failed to unsubscribe" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {state.kind === "validating" && (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verifying your unsubscribe link…</p>
            </>
          )}
          {state.kind === "invalid" && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="text-xl font-semibold">Invalid or expired link</h1>
              <p className="text-sm text-muted-foreground">
                This unsubscribe link is not valid. If you keep receiving unwanted
                emails, please reply directly and we'll take you off the list.
              </p>
            </>
          )}
          {state.kind === "already" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-xl font-semibold">You're already unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                We won't send further emails to this address.
              </p>
            </>
          )}
          {state.kind === "ready" && (
            <>
              <h1 className="text-xl font-semibold">Unsubscribe from Aurelix emails?</h1>
              <p className="text-sm text-muted-foreground">
                Click below to stop receiving these emails.
              </p>
              <Button onClick={confirm} className="w-full">
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {state.kind === "submitting" && (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Unsubscribing…</p>
            </>
          )}
          {state.kind === "done" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-xl font-semibold">You've been unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                We're sorry to see you go. You can always reply to us if you change
                your mind.
              </p>
            </>
          )}
          {state.kind === "error" && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="text-xl font-semibold">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <Button onClick={confirm} variant="secondary">
                Try again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
