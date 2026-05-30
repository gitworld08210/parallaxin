import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/vibe/GlassCard";
import { ShieldCheck, CheckCircle2, Circle, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function VerificationCenter() {
  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Verification Center" />
      <div className="p-4 space-y-5">
        <GlassCard className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/15 grid place-items-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold">Get Verified on Aurelix</p>
            <p className="text-xs text-muted-foreground mt-1">Show your authenticity. Build trust. Stand out.</p>
          </div>
        </GlassCard>

        <Link to="/verification">
          <Button className="w-full">Request Verification</Button>
        </Link>

        <div>
          <p className="text-sm font-semibold mb-3">Your Verification</p>
          <GlassCard className="divide-y divide-border p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">Not Verified</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Eligibility</p>
                <p className="text-xs text-muted-foreground">You are eligible to apply</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Benefits</p>
                <p className="text-xs text-muted-foreground">Stand out, get discovered</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <button className="w-full flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-muted/40">
          <span className="text-sm">Learn more about verification</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
