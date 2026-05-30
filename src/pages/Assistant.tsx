import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { TopBar } from "@/components/vibe/TopBar";
import { GlassCard } from "@/components/vibe/GlassCard";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Rewrite my bio in 3 styles",
  "Suggest hashtags for a coffee reel",
  "Give me 5 caption ideas for a sunset photo",
  "How do I grow to 10k followers?",
];

const Assistant = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(0, -1) }),
      });
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
              endRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "Network error");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar subtitle="AI" title="Aurelix AI" />
      <div className="flex-1 px-5 pb-40 space-y-3">
        {messages.length === 0 && (
          <GlassCard className="p-5 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="font-display text-lg">Your creator co-pilot</p>
            <p className="text-xs text-muted-foreground mt-1">Powered by GPT-5.5 Pro</p>
            <div className="mt-4 grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="glass-strong rounded-xl px-3 py-2.5 text-xs text-left">{s}</button>
              ))}
            </div>
          </GlassCard>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "glass"
            }`}>
              {m.content || (streaming ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md p-3 flex gap-2 glass-strong border-t border-border"
      >
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aurelix AI…"
          className="flex-1 glass rounded-full px-4 py-2.5 text-sm outline-none"
        />
        <button disabled={streaming} className="h-10 w-10 grid place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default Assistant;
