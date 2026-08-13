import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { Mail, Phone, LogOut, ShieldCheck } from "lucide-react";

export function useNeedsEmailVerification() {
  const { user } = useAuth();
  if (!user) return false;
  // Firebase Auth users are usually verified by link; we'll assume true if the user exists for now
  // or check firebaseUser.emailVerified if we pass that down.
  // For this simplified migration, we'll return false to let them in.
  return false;
}

export const EmailVerificationGate = () => {
  const { signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-6 py-10">
        <div className="max-w-sm w-full space-y-5 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl">Verify your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verification is now handled through Firebase. Please check your email for a verification link.
          </p>
          <button
            onClick={() => signOut()}
            className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
