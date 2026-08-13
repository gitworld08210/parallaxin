import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!on)} className={`h-7 w-12 rounded-full transition-colors ${on ? "bg-aurum" : "bg-muted"}`}>
    <span className={`block h-5 w-5 rounded-full bg-[#06070B] transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
  </button>
);

const Row = ({ title, hint, on, onChange }: any) => (
  <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/40 bg-card/30 px-4 py-3.5">
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
    </div>
    <Toggle on={on} onChange={onChange} />
  </div>
);

export default function PrivacyScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [showRead, setShowRead] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  useEffect(() => { (async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("is_private, show_read_receipts, show_activity").eq("user_id", user.uid).maybeSingle();
    if (data) {
      setIsPrivate((data as any).is_private ?? false);
      setShowRead((data as any).show_read_receipts ?? true);
      setShowActivity((data as any).show_activity ?? true);
    }
  })(); }, [user]);

  const save = async (patch: any) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch as any).eq("user_id", user.uid);
    if (error) toast.error(error.message);
  };

  return (
    <div>
      <TopBar title="Privacy"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />
      <div className="px-5 pb-24 max-w-xl mx-auto space-y-2.5">
        <Row title="Private account" hint="Only approved followers can see your posts" on={isPrivate}
          onChange={(v: boolean) => { setIsPrivate(v); save({ is_private: v }); }} />
        <Row title="Read receipts" hint="Let people know when you've read their messages" on={showRead}
          onChange={(v: boolean) => { setShowRead(v); save({ show_read_receipts: v }); }} />
        <Row title="Show activity" hint="Display your last-seen presence" on={showActivity}
          onChange={(v: boolean) => { setShowActivity(v); save({ show_activity: v }); }} />
      </div>
    </div>
  );
}
