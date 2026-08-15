import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

export default function TwoFactorSetup() {
  const nav = useNavigate();

  return (
    <div>
      <TopBar
        title="Aura Shield"
        subtitle="Two-factor authentication"
        right={
          <button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-5 pb-24 max-w-md mx-auto space-y-6">
        <div className="rounded-3xl border border-aurum/20 bg-gradient-to-b from-aurum/5 to-transparent p-6 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-aurum/10 grid place-items-center text-aurum mb-3">
            <Shield className="h-6 w-6" />
          </div>
          <p className="font-serif text-xl">Firebase protection</p>
          <p className="text-xs text-muted-foreground mt-1">
            Authentication is now managed by Firebase. The former Supabase authenticator did not protect Firebase sign-ins.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Enrollment temporarily unavailable</p>
            <p className="text-xs text-muted-foreground">
              Firebase TOTP enrollment will be enabled after Identity Platform and the MFA sign-in challenge are configured. Existing Google accounts remain protected by their provider's two-step verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
