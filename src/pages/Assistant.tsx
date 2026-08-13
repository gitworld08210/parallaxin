import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TopBar } from "@/components/vibe/TopBar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";


type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Rewrite my bio in 3 styles",
  "Caption ideas for a sunset photo",
  "Hashtag strategy for a coffee reel",
  "How do I grow to 10k followers?",
];

const Assistant = () => {
  const user = auth.currentUser;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    try {
      if (!user) {
        toast.error("Please sign in to use the assistant.");
        setStreaming(false);
        return;
      }
      const token = await (user as any).getIdToken();
      const url = `https://qnugwtuwyjxhchvwbxfa.supabase.co/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: next, model: "gpt-4o" }),
      });
      if (resp.status === 429) { toast.error("Rate limit hit. Try again shortly."); setStreaming(false); return; }

      if (resp.status === 402) { toast.error("AI credits exhausted. Add credits in Settings."); setStreaming(false); return; }
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        toast.error(t || "AI error");
        setStreaming(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistant = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }

          } catch {}
        }
      }
    } catch (e: any) { toast.error(e.message || "Action failed"); } finally {
      setStreaming(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TopBar title="Aurelix AI" subtitle="GPT-5.5 Pro" />

      <div className="flex-1 px-4 pb-36 pt-2 space-y-4">
        {isEmpty && (
          <div className="text-center pt-12 pb-8">
            <div className="inline-grid place-items-center h-12 w-12 rounded-full bg-muted mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Your creator co-pilot</h2>
            <p className="text-xs text-muted-foreground mt-1">Ask anything about growth, captions, or strategy.</p>
            <div className="mt-6 grid gap-2 max-w-sm mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLastAssistant = !isUser && i === messages.length - 1 && streaming;
          return (
            <div key={i} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md",
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content || ""}
                    </ReactMarkdown>
                    {isLastAssistant && (
                      <span className="inline-block w-1.5 h-3.5 bg-foreground/70 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md p-3 flex gap-2 liquid-nav border-t border-border/50 rounded-none"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aurelix AI…"
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          disabled={streaming || !input.trim()}
          className="h-10 w-10 grid place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 active:scale-95 transition-transform"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default Assistant;
