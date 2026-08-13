import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, FileText, ChevronLeft, Trash2, Send } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";

type Draft = {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  status: "draft" | "scheduled";
  scheduled_for: string | null;
  created_at: string;
};

const Drafts = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<Draft[]>([]);
  const [tab, setTab] = useState<"draft" | "scheduled">("draft");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("posts").select("id, content, media_url, media_type, status, scheduled_for, created_at").eq("user_id", user.uid).in("status", ["draft", "scheduled"]).order("created_at", { ascending: false });
    setItems((data ?? []) as Draft[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.uid]);

  const publishNow = async (id: string) => {
    const { error } = await supabase.from("posts").update({ status: "published" as any, scheduled_for: null }).eq("id", id);
    if (error) return toast.error(error.message);

    toast.success("Published");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this draft?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((arr) => arr.filter((i) => i.id !== id));
  };

  const visible = items.filter((i) => i.status === tab);

  return (
    <div>
      <header className="h-14 px-2 flex items-center gap-2 border-b border-border">
        <button onClick={() => nav(-1)} className="p-1" aria-label="Back">
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="text-base font-semibold">Drafts &amp; scheduled</h1>
      </header>

      <div className="flex border-b border-border">
        {[
          { id: "draft" as const, label: "Drafts", icon: FileText },
          { id: "scheduled" as const, label: "Scheduled", icon: Calendar },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-semibold relative flex items-center justify-center gap-1.5 ${tab === t.id ? "text-foreground" : "text-muted-foreground"}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {tab === t.id && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-foreground" />}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border">
        {loading && <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16 px-6">
            <p className="text-sm text-muted-foreground mb-4">
              {tab === "draft" ? "No drafts saved." : "No scheduled posts."}
            </p>
            <Link to="/compose" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
              New post
            </Link>
          </div>
        )}
        {visible.map((d) => (
          <div key={d.id} className="flex gap-3 px-3 py-3 items-start">
            <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
              {d.media_url ? (
                d.media_type === "video"
                  ? <video src={d.media_url} muted className="h-full w-full object-cover" />
                  : <img src={d.media_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground p-1 text-center">Text</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm line-clamp-2 break-words">{d.content || <span className="text-muted-foreground italic">No caption</span>}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {d.status === "scheduled" && d.scheduled_for
                  ? <>Scheduled for {new Date(d.scheduled_for).toLocaleString()}</>
                  : <>Saved {timeAgo(d.created_at)} ago</>}
              </p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => publishNow(d.id)} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1">
                  <Send className="h-3.5 w-3.5" /> Publish
                </button>
                <button onClick={() => remove(d.id)} className="px-3 py-1.5 rounded-md bg-muted text-foreground text-xs font-semibold inline-flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Drafts;
