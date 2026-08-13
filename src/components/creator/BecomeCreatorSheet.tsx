import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Zap, Sparkles } from "lucide-react";

interface BecomeCreatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BecomeCreatorSheet({ open, onOpenChange }: BecomeCreatorSheetProps) {
  const { user, refreshProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    (async () => {
      if (!open) return;
      try {
        const configDoc = await getDoc(doc(db, "config", "creator_terms"));
        if (configDoc.exists()) {
          setVersion(configDoc.data().version || "1.0.0");
        }
      } catch (err) {
        console.error("Error fetching creator config:", err);
      }
    })();
  }, [open]);

  const handleBecomeCreator = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const profileRef = doc(db, "profiles", user.uid);
      await updateDoc(profileRef, {
        is_creator: true,
        creator_terms_version: version,
        creator_activated_at: new Date().toISOString()
      });
      toast.success("Welcome, Creator ✦");
      if (refreshProfile) await refreshProfile();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Could not enable creator mode");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] sm:h-[80vh] bg-black border-zinc-800 rounded-t-3xl p-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <SheetHeader className="text-center pt-4">
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
            <SheetTitle className="text-3xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
              Become a Creator
            </SheetTitle>
            <SheetDescription className="text-zinc-400 text-lg">
              Unlock monetization and exclusive tools.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
              <Zap className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-white">Monetization</h3>
              <p className="text-sm text-zinc-500">Earn from subscriptions, tips, and exclusive content.</p>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
              <ShieldCheck className="w-6 h-6 text-green-500" />
              <h3 className="font-semibold text-white">Verification</h3>
              <p className="text-sm text-zinc-500">Get a creator badge and improved visibility.</p>
            </div>
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
              <Sparkles className="w-6 h-6 text-blue-500" />
              <h3 className="font-semibold text-white">Advanced Tools</h3>
              <p className="text-sm text-zinc-500">Access Creator Studio and analytics dashboard.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
            <p className="text-xs text-zinc-500 leading-relaxed">
              By clicking "Agree & Join", you agree to the Aurelix Creator Terms (v{version}). 
              Monetization is subject to verification and adherence to our Community Guidelines.
            </p>
          </div>
        </div>

        <SheetFooter className="p-6 border-t border-zinc-900 bg-black/80 backdrop-blur-xl flex flex-col sm:flex-row gap-3">
          <Button 
            variant="ghost" 
            className="w-full sm:flex-1 text-zinc-400 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            className="w-full sm:flex-2 bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 rounded-xl transition-all active:scale-95"
            onClick={handleBecomeCreator}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Agree & Join"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
