import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { useKipConversations, useKipMessages, useKipCitations, useCreateConversation, useKipCollections } from "@/hooks/admin-os/useKip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Send, Plus, FileText, Bot, User as UserIcon, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; id?: string };
type Citation = { index: number; document_id: string; title: string; version: number; section: string | null; similarity: number; snippet: string };

export default function ChatWorkspace() {
  const [params, setParams] = useSearchParams();
  const collectionParam = params.get("collection") ?? undefined;
  const convParam = params.get("c") ?? undefined;
  const { user } = useAuth();
  const { data: conversations = [] } = useKipConversations();
  const { data: collections = [] } = useKipCollections();
  const createConv = useCreateConversation();

  const [activeId, setActiveId] = useState<string | undefined>(convParam);
  const [collectionId, setCollectionId] = useState<string | undefined>(collectionParam);
  const [pendingMsgs, setPendingMsgs] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [liveCitations, setLiveCitations] = useState<Citation[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: persistedMsgs = [] } = useKipMessages(activeId);
  const messageIds = persistedMsgs.filter((m) => m.role === "assistant").map((m) => m.id);
  const { data: persistedCites = [] } = useKipCitations(messageIds);

  const displayMessages: Msg[] = useMemo(() => {
    if (streaming || pendingMsgs.length) {
      return [...persistedMsgs.map((m) => ({ role: m.role as any, content: m.content, id: m.id })), ...pendingMsgs];
    }
    return persistedMsgs.map((m) => ({ role: m.role as any, content: m.content, id: m.id }));
  }, [persistedMsgs, pendingMsgs, streaming]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 40);
  }, [displayMessages.length, pendingMsgs]);

  useEffect(() => { if (convParam) setActiveId(convParam); }, [convParam]);

  const newChat = async () => {
    const c = await createConv.mutateAsync({ collection_id: collectionId ?? null });
    setActiveId(c.id);
    setPendingMsgs([]);
    setLiveCitations([]);
    setParams({ ...(collectionId ? { collection: collectionId } : {}), c: c.id });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    let convId = activeId;
    if (!convId) {
      const c = await createConv.mutateAsync({ collection_id: collectionId ?? null, title: text.slice(0, 60) });
      convId = c.id;
      setActiveId(convId);
      setParams({ ...(collectionId ? { collection: collectionId } : {}), c: convId });
    }
    const history: Msg[] = [
      ...persistedMsgs.map((m) => ({ role: m.role as any, content: m.content })),
      ...pendingMsgs,
      { role: "user", content: text },
    ];
    setPendingMsgs((p) => [...p, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    setLiveCitations([]);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/kip-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: convId, messages: history, collectionId }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.text();
        toast.error(err || "AI error");
        setStreaming(false);
        return;
      }
      const citesHeader = resp.headers.get("X-Kip-Citations");
      if (citesHeader) { try { setLiveCitations(JSON.parse(citesHeader)); } catch {} }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const delta = j.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              setPendingMsgs((p) => {
                const clone = [...p];
                clone[clone.length - 1] = { role: "assistant", content: full };
                return clone;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Stream failed");
    } finally {
      setStreaming(false);
      // Clear pending after 800ms to let persisted messages refetch
      setTimeout(() => { setPendingMsgs([]); }, 1200);
    }
  };

  // Citations to render for the latest assistant message
  const activeCitations: Citation[] = liveCitations.length
    ? liveCitations
    : (() => {
        const lastAssistant = [...persistedMsgs].reverse().find((m) => m.role === "assistant");
        if (!lastAssistant) return [];
        return persistedCites.filter((c) => c.message_id === lastAssistant.id).map((c, i) => ({
          index: i + 1,
          document_id: c.document_id,
          title: "Source",
          version: c.version_number ?? 1,
          section: c.section,
          similarity: c.relevance ?? 0,
          snippet: c.snippet ?? "",
        }));
      })();

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px] h-[calc(100vh-260px)] min-h-[500px]">
      {/* Conversation list */}
      <div className="rounded-lg border border-border/60 flex flex-col overflow-hidden">
        <div className="p-2 border-b border-border/60 flex gap-2">
          <Button size="sm" className="flex-1" onClick={newChat}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveId(c.id); setPendingMsgs([]); setLiveCitations([]); setParams({ c: c.id }); }}
              className={`w-full text-left px-2 py-2 rounded-md text-xs truncate ${activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"}`}
            >
              {c.title}
            </button>
          ))}
          {conversations.length === 0 && <p className="text-xs text-muted-foreground p-3">No conversations yet.</p>}
        </div>
      </div>

      {/* Chat pane */}
      <div className="rounded-lg border border-border/60 flex flex-col overflow-hidden bg-card">
        <div className="p-3 border-b border-border/60 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">KIP Knowledge Assistant</p>
          <div className="ml-auto">
            <Select value={collectionId ?? "all"} onValueChange={(v) => setCollectionId(v === "all" ? undefined : v)}>
              <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Scope: all authorized" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All authorized knowledge</SelectItem>
                {collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayMessages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Ask a question about your company knowledge. Every answer will cite its sources.
            </div>
          )}
          {displayMessages.map((m, i) => (
            <div key={m.id ?? i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-primary" /></div>
              )}
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
              {m.role === "user" && (
                <div className="rounded-full bg-muted h-8 w-8 flex items-center justify-center shrink-0"><UserIcon className="h-4 w-4" /></div>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border/60 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about policies, decisions, reports, SOPs..."
            rows={2}
            disabled={streaming}
          />
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground">Answers grounded on indexed knowledge only. No fabrication.</p>
            <Button size="sm" onClick={send} disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4 mr-1" /> {streaming ? "Thinking…" : "Send"}
            </Button>
          </div>
        </div>
      </div>

      {/* Citations panel */}
      <div className="rounded-lg border border-border/60 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border/60">
          <p className="text-sm font-medium">Sources</p>
          <p className="text-[10px] text-muted-foreground">Every AI answer is traceable.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {activeCitations.length === 0 && <p className="text-xs text-muted-foreground p-2">Sources will appear here after the AI responds.</p>}
          {activeCitations.map((c) => (
            <Card key={`${c.document_id}-${c.index}`} className="border-border/60">
              <CardContent className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground">[{c.index}]</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">v{c.version}</Badge>
                </div>
                <p className="text-xs font-medium line-clamp-2">{c.title}</p>
                {c.section && <p className="text-[10px] text-muted-foreground">{c.section}</p>}
                <p className="text-[10px] text-muted-foreground line-clamp-3">{c.snippet}</p>
                <p className="text-[9px] text-muted-foreground">Relevance {(c.similarity * 100).toFixed(0)}%</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
