import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/vibe/GlassCard";

const CheckoutReturn = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => { document.title = "Payment complete · Aurelix"; }, []);

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <GlassCard className="p-8 max-w-md w-full text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto" />
        <h1 className="font-display text-2xl font-semibold">Payment complete</h1>
        <p className="text-sm text-muted-foreground">
          Thanks for supporting Aurelix. Your purchase is being processed — your account will update in a few seconds.
        </p>
        {sessionId && <p className="text-[10px] text-muted-foreground break-all">Ref: {sessionId}</p>}
        <div className="flex flex-col gap-2 pt-2">
          <Link to="/store" className="text-sm font-semibold px-4 py-3 rounded-full bg-primary text-primary-foreground">
            Back to Store
          </Link>
          <Link to="/" className="text-xs text-muted-foreground">Go home</Link>
        </div>
      </GlassCard>
    </div>
  );
};

export default CheckoutReturn;
