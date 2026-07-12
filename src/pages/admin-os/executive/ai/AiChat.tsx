import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Trash2, Pin, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  useAiConversations, useAiMessages, useCreateConversation, useDeleteConversation,
  useUpdateConversation, insertAiMessage, streamExecutiveAi, useSubmitFeedback,
} from "@/hooks/admin-os/useExecutiveAi";
import { useQueryClient } from "@tanstack/react-query";

const SUGGESTED = [
  "What requires my attention today?",
  "Which approvals are overdue?",
  "Summarize this month's performance.",
  "Which departments are underperforming?",
  "Show current security risks.",
  "Recommend hiring priorities.",
];

const AiChat = () => {
  const qc = useQueryClient();
  const { data: conversations = [] } = useAiConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages = [] } = useAiMessages(activeId ?? undefined);
  const create = useCreateConversation();
  const del = useDeleteConversation();
  const update = useUpdateConversation();
  const feedback = useSubmitFeedback();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId && conversations[0]) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const newConversation = async () => {
    const c = await create.mutateAsync(undefined);
    setActiveId(c.id);
  };

  const send = async (prompt?: string) => {
    const content = (prompt ?? input).trim();
    if (!content || busy) return;
    let convId = activeId;
    if (!convId) {
      const c = await create.mutateAsync(content.slice(0, 60));
      convId = c.id;
      setActiveId(convId);
    } else if (messages.length === 0) {
      await update.mutateAsync({ id: convId, title: content.slice(0, 60) });
    }
    setInput("");
    setBusy(true);
    setStreaming("");
    try {
      await insertAiMessage(convId!, "user", content);
      qc.invalidateQueries({ queryKey: ["ai-messages", convId] });
      const history = [
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];
      let full = "";
      await streamExecutiveAi({
        conversationId: convId!, messages: history,
        onDelta: (d) => { full += d; setStreaming((prev) => prev + d); },
      });
      await insertAiMessage(convId!, "assistant", full);
      qc.invalidateQueries({ queryKey: ["ai-messages", convId] });
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
    } catch (e: any) {
      await insertAiMessage(convId!, "assistant", `⚠️ ${e.message ?? "AI error"}`, { error: e.message });
      qc.invalidateQueries({ queryKey: ["ai-messages", convId] });
    } finally {
      setBusy(false);
      setStreaming("");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[540px]">
      {/* Sidebar */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Conversations</CardTitle>
            <Button size="sm" variant="ghost" onClick={newConversation}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {conversations.map((c: any) => (
              <div key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`group px-3 py-2 rounded-md cursor-pointer text-sm flex items-center justify-between gap-2 ${activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted/40"}`}>
                <span className="truncate flex-1">{c.title}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); update.mutate({ id: c.id, is_pinned: !c.is_pinned }); }}>
                    <Pin className={`h-3 w-3 ${c.is_pinned ? "fill-current" : ""}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) { del.mutate(c.id); if (activeId === c.id) setActiveId(null); } }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {conversations.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No conversations yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Chat pane */}
      <Card className="flex flex-col">
        <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
              <h3 className="text-lg font-semibold">Ask your executive AI</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Advisory only. Every recommendation includes reasoning, supporting data and a confidence level. Founder Office retains final authority.
              </p>
              <div className="mt-6 grid gap-2 max-w-lg mx-auto">
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left px-3 py-2 rounded-md border border-border/60 hover:bg-muted/40 text-sm">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m: any) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4 text-primary" /></div>}
              <div className={`max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2" : ""}`}>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    <div className="flex gap-2 mt-2 not-prose">
                      <button onClick={() => feedback.mutate({ messageId: m.id, rating: "up" })} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"><ThumbsUp className="h-3 w-3" /></button>
                      <button onClick={() => feedback.mutate({ messageId: m.id, rating: "down" })} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><ThumbsDown className="h-3 w-3" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4 text-primary" /></div>
              <div className="prose prose-sm dark:prose-invert max-w-none max-w-[85%]">
                <ReactMarkdown>{streaming}</ReactMarkdown>
              </div>
            </div>
          )}
          {busy && !streaming && <p className="text-xs text-muted-foreground animate-pulse">Thinking...</p>}
        </CardContent>

        <div className="border-t border-border/60 p-3">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask the executive AI..."
              rows={1}
              className="min-h-[44px] resize-none"
              disabled={busy}
            />
            <Button onClick={() => send()} disabled={busy || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">google/gemini-2.5-flash</Badge>
            <span>Advisory only · Founder Office retains final authority</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AiChat;
