import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Sparkles } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function DataExportScreen() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const exportNow = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data", {});
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `aurelix-archive-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      toast.success("Archive prepared");
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally { setBusy(false); }
  };

  return (
    <div>
      <TopBar title="Your archive"
        right={<button onClick={() => nav(-1)} className="glass h-11 w-11 rounded-full grid place-items-center"><ChevronLeft className="h-5 w-5" /></button>} />
      <div className="px-5 pb-24 max-w-md mx-auto space-y-5">
        <div className="rounded-3xl border border-aurum/20 bg-gradient-to-b from-aurum/5 to-transparent p-6 text-center">
          <div className="h-14 w-14 mx-auto rounded-full bg-aurum/10 grid place-items-center text-aurum mb-3"><Sparkles className="h-6 w-6" /></div>
          <p className="font-serif text-xl">An archive of you</p>
          <p className="text-xs text-muted-foreground mt-2">Profile, posts, comments, follows, saves, messages and highlights — assembled into a single JSON ledger. Limited to one export every 24 hours.</p>
        </div>
        <button disabled={busy} onClick={exportNow}
          className="w-full rounded-2xl bg-aurum text-[#06070B] py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download archive"}
        </button>
      </div>
    </div>
  );
}
