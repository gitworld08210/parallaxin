import { supabase } from '@/integrations/supabase/client';
import { reliableInvoke } from "@/lib/reliableInvoke";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImagePlus, Sparkles, X, FileText, Calendar, Users, Hash, Clock, ShieldCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TopBar } from "@/components/vibe/TopBar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { FilterStrip, FilterKey, filterCss } from "@/components/compose/FilterStrip";
import { uploadToCloudinary } from "@/lib/cloudinary";


type CollabPick = { user_id: string; username: string; display_name: string; avatar_url: string | null };

const Compose = () => {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [altBusy, setAltBusy] = useState(false);
  const [altText, setAltText] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [certify, setCertify] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("none");

  // AI suggest
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [bestTimeIso, setBestTimeIso] = useState<string>("");

  // Collaborators
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState<CollabPick[]>([]);
  const [collabs, setCollabs] = useState<CollabPick[]>([]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!collabQuery.trim() || !user) { setCollabResults([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, username, display_name, avatar_url").ilike("username", `%${collabQuery.trim()}%`).neq("user_id", user.id).limit(8);
      if (!cancelled) setCollabResults((data ?? []) as any);
    })();
    return () => { cancelled = true; };
  }, [collabQuery, user?.id]);

  const aiCaption = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: { content, media_type: file ? (file.type.startsWith("video") ? "video" : "image") : null },
      });
      if (error) throw error;
      if (data?.caption) setContent(data.caption);
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setAiBusy(false); }
  };

  const aiSuggest = async () => {
    setSuggestBusy(true);
    setSuggestOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-post-tags", {
        body: { content, media_type: file ? (file.type.startsWith("video") ? "video" : "image") : null },
      });
      if (error) throw error;
      setSuggestedTags(data?.hashtags ?? []);
      setBestTimeIso(data?.best_time_iso ?? "");
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setSuggestBusy(false); }
  };

  const addTag = (tag: string) => {
    if (content.includes(tag)) return;
    setContent((c) => (c.trim() ? c.trim() + " " : "") + tag);
  };

  const useBestTime = () => {
    if (!bestTimeIso) return;
    const dt = new Date(bestTimeIso);
    const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setScheduledFor(local);
    setSuggestOpen(false);
    setScheduleOpen(true);
  };

  const suggestAlt = async () => {
    if (!file || !user) return toast.error("Add an image first");
    if (file.type.startsWith("video")) return toast.error("Alt text is for images");
    setAltBusy(true);
    try {
      const url = await uploadToCloudinary(file);
      const { data, error } = await supabase.functions.invoke("suggest-alt-text", {
        body: { image_url: url },
      });
      if (error) throw error;

      if (data?.altText) setAltText(data.altText);
      else toast.error("No suggestion returned");
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setAltBusy(false); }
  };

  const uploadMedia = async () => {
    if (!file || !user) return { media_url: null, media_type: null };
    setBusy(true);
    try {
      const url = await uploadToCloudinary(file);
      return { media_url: url, media_type: file.type.startsWith("video") ? "video" : "image" };
    } catch (e: any) {
      toast.error("Upload failed: " + (e.message || "Unknown error"));
      throw e;
    }
  };

  const insertPost = async (status: "draft" | "scheduled" | "published", scheduled_for: string | null) => {
    if (!user) return;
    if (!content.trim() && !file) return toast.error("Add a thought or media");
    setBusy(true);
    try {
      if (status === "published" && content.trim()) {
        try {
          const { data: mod } = await reliableInvoke("moderate-content", { body: { content: content.trim() }, retries: 1 });
          if ((mod as any)?.flagged) throw new Error((mod as any).reason || "Content flagged by moderation");
        } catch (modErr: any) {
          // Only block if moderation actually flagged content; ignore transport/AI errors.
          if (modErr?.message && !/non-2xx|Failed to fetch|FunctionsHttpError|FunctionsFetchError/i.test(modErr.message)) {
            throw modErr;
          }
        }
      }
      const { media_url, media_type } = await uploadMedia();
      const docRef = await addDoc(collection(db, "posts"), {
        user_id: user.id,
        content: content.trim(),
        media_url,
        media_type,
        status,
        scheduled_for,
        is_reel: false,
        like_count: 0,
        comment_count: 0,
        created_at: serverTimestamp(),
        profile: {
          username: profile?.username || "",
          display_name: profile?.display_name || "User",
          avatar_url: profile?.avatar_url || null,
          verified: !!profile?.verified,
          verification_kind: profile?.verification_kind || null,
          is_founder: !!(profile as any)?.is_founder,
          join_era: (profile as any)?.join_era || null
        }
      });
      const newId = docRef.id;

      // Invite collaborators
      if (newId && collabs.length) {
        await supabase.from("post_collaborators").insert(collabs.map((c) => ({ post_id: newId, user_id: c.user_id })));
      }


      // Enrichment — awaited via reliableInvoke, failures logged (Phase 0).
      if (newId && status === "published") {
        void reliableInvoke("embed-post", { body: { post_id: newId }, retries: 2 });
      }
      if (newId && status === "published" && certify && file) {
        const { error: certErr } = await reliableInvoke("ownership-certify", { body: { post_id: newId }, retries: 1 });
        if (certErr) toast.error("Certificate failed: " + certErr.message);
      }
      if (newId && status === "published") {
        void reliableInvoke("authenticity-score", { body: { post_id: newId }, retries: 1 });
      }

      if (status === "published") { toast.success("Posted ✦"); nav("/"); }
      else if (status === "draft") { toast.success("Draft saved"); nav("/drafts"); }
      else { toast.success(`Scheduled for ${new Date(scheduled_for!).toLocaleString()}`); nav("/drafts"); }
    } catch (e: any) { toast.error(e.message || "Action failed"); }
    finally { setBusy(false); }
  };

  const submit = () => insertPost("published", null);
  const saveDraft = () => insertPost("draft", null);
  const schedule = () => {
    if (!scheduledFor) return toast.error("Pick a date and time");
    const iso = new Date(scheduledFor).toISOString();
    if (new Date(iso).getTime() <= Date.now()) return toast.error("Pick a future time");
    setScheduleOpen(false);
    insertPost("scheduled", iso);
  };

  return (
    <div>
      <TopBar
        title="New post"
        right={
          <>
            <Link to="/drafts" className="p-2" aria-label="Drafts"><FileText className="h-5 w-5 text-foreground" strokeWidth={1.75} /></Link>
            <button onClick={() => nav(-1)} className="p-2" aria-label="Close"><X className="h-5 w-5" /></button>
          </>
        }
      />

      <div className="px-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share something…"
          maxLength={1000}
          rows={5}
          className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-[15px] outline-none resize-none focus:border-primary/50 transition-colors"
        />

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <label className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-zinc-800 transition-colors">
            <ImagePlus className="h-4 w-4 text-primary" /> Media
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button disabled={aiBusy} onClick={aiCaption} className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors">
            <Sparkles className="h-4 w-4 text-primary" />{aiBusy ? "Generating…" : "AI caption"}
          </button>
          <button disabled={suggestBusy} onClick={aiSuggest} className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors">
            <Hash className="h-4 w-4 text-primary" />{suggestBusy ? "…" : "AI suggest"}
          </button>
          <button onClick={() => setCollabOpen(true)} className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors">
            <Users className="h-4 w-4 text-primary" />Collab{collabs.length > 0 && ` · ${collabs.length}`}
          </button>
        </div>

        {collabs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {collabs.map((c) => (
              <span key={c.user_id} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                @{c.username}
                <button onClick={() => setCollabs((arr) => arr.filter((x) => x.user_id !== c.user_id))} className="opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {preview && (
          <div className="mt-4 space-y-2">
            <div className="relative rounded-xl overflow-hidden bg-muted">
              {file?.type.startsWith("video") ? (
                <video src={preview} controls className="w-full max-h-[400px] object-cover" style={{ filter: filterCss(filter) }} />
              ) : (
                <img src={preview} className="w-full max-h-[400px] object-cover" alt={altText || ""} style={{ filter: filterCss(filter) }} />
              )}
              <button onClick={() => { setFile(null); setAltText(""); setFilter("none"); }} className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/60 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {file && !file.type.startsWith("video") && (
              <div className="pt-1">
                <FilterStrip value={filter} onChange={setFilter} previewUrl={preview} />
              </div>
            )}
            {file && !file.type.startsWith("video") && (
              <div className="flex items-start gap-2">
                <textarea value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Alt text (for accessibility)" rows={2} maxLength={200} className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-xs outline-none resize-none" />
                <button onClick={suggestAlt} disabled={altBusy} className="shrink-0 bg-muted rounded-md px-3 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />{altBusy ? "…" : "Suggest"}
                </button>
              </div>
            )}
          </div>
        )}

        {file && (
          <label className="mt-4 flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-zinc-900 cursor-pointer hover:bg-zinc-800 transition-colors">
            <input type="checkbox" checked={certify} onChange={(e) => setCertify(e.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-black text-primary focus:ring-primary" />
            <div className="flex-1">
              <p className="text-[14px] font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Generate ownership certificate
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Anchors a SHA-256 hash of your media to Bitcoin via OpenTimestamps. Proof of timestamp, not a copyright filing.
              </p>
            </div>
          </label>
        )}

        <div className="mt-8 grid grid-cols-3 gap-3">
          <button onClick={saveDraft} disabled={busy} className="h-14 rounded-2xl bg-zinc-900 border border-white/5 text-white font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50">
            <FileText className="h-4 w-4" /> Draft
          </button>
          <button onClick={() => setScheduleOpen(true)} disabled={busy} className="h-14 rounded-2xl bg-zinc-900 border border-white/5 text-white font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50">
            <Calendar className="h-4 w-4" /> Schedule
          </button>
          <button onClick={submit} disabled={busy} className="h-14 rounded-2xl bg-primary text-white font-bold text-[14px] shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* AI Suggest sheet */}
      <Sheet open={suggestOpen} onOpenChange={setSuggestOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI suggestions
            </SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><Hash className="h-3 w-3" /> Hashtags</p>
              {suggestBusy ? <p className="text-sm text-muted-foreground">Thinking…</p> : (
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map((t) => (
                    <button key={t} onClick={() => addTag(t)} className="text-xs bg-muted hover:bg-primary/10 text-foreground hover:text-primary px-2.5 py-1.5 rounded-full font-medium transition-colors">
                      {t}
                    </button>
                  ))}
                  {!suggestedTags.length && !suggestBusy && <p className="text-sm text-muted-foreground">No suggestions</p>}
                </div>
              )}
            </div>
            {bestTimeIso && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Best time to post</p>
                <button onClick={useBestTime} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/50 transition-colors">
                  <span className="text-sm font-semibold">{new Date(bestTimeIso).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                  <span className="text-xs text-primary font-semibold">Schedule →</span>
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Collab picker */}
      <Sheet open={collabOpen} onOpenChange={setCollabOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left flex items-center gap-2"><Users className="h-4 w-4" /> Invite collaborators</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <input
              value={collabQuery}
              onChange={(e) => setCollabQuery(e.target.value)}
              placeholder="Search username…"
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none"
            />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {collabResults.map((r) => {
                const added = collabs.some((c) => c.user_id === r.user_id);
                return (
                  <button
                    key={r.user_id}
                    onClick={() => {
                      if (added) setCollabs((arr) => arr.filter((x) => x.user_id !== r.user_id));
                      else if (collabs.length >= 5) toast.error("Max 5 collaborators");
                      else setCollabs((arr) => [...arr, r]);
                    }}
                    className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-md text-left"
                  >
                    {r.avatar_url ? <img src={r.avatar_url} className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-gradient-primary" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.display_name || r.username}</p>
                      <p className="text-xs text-muted-foreground">@{r.username}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${added ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
                      {added ? "Added" : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setCollabOpen(false)} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm">Done</button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Schedule */}
      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-foreground text-left flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule post</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <label className="block text-xs text-muted-foreground font-semibold uppercase">Publish at</label>
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm outline-none" />
            <button onClick={schedule} disabled={busy || !scheduledFor} className="w-full py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60">Schedule</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Compose;
