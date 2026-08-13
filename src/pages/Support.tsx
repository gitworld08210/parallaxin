import { supabase } from "@/integrations/supabase/client";
/**
 * Support — user-facing help & request center.
 *
 * Users submit a ticket here; the DB trigger auto-routes it to the correct
 * admin department (Verification, Trust & Safety, People Ops, Finance,
 * Engineering, Organizations, Creator Success, or Support) based on the
 * chosen category. Users also see the status of their previous tickets.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, ShieldCheck, BadgeCheck, HeartHandshake, Bug, CreditCard,
  Users, Wrench, MessageSquare, Send, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";

type Category = {
  key: string;
  label: string;
  team: string;
  icon: any;
  tint: string;
};

const CATEGORIES: Category[] = [
  { key: "verification",    label: "Verification",      team: "Verification Team",   icon: BadgeCheck,     tint: "text-blue-500 bg-blue-500/10" },
  { key: "trust_safety",    label: "Safety / Abuse",    team: "Trust & Safety",      icon: ShieldCheck,    tint: "text-rose-500 bg-rose-500/10" },
  { key: "appeal",          label: "Appeal a decision", team: "Trust & Safety",      icon: AlertTriangle,  tint: "text-amber-500 bg-amber-500/10" },
  { key: "account",         label: "Account help",      team: "Support",             icon: LifeBuoy,       tint: "text-emerald-500 bg-emerald-500/10" },
  { key: "billing",         label: "Billing / Payment", team: "Finance",             icon: CreditCard,     tint: "text-emerald-600 bg-emerald-600/10" },
  { key: "hr",              label: "HR / People",       team: "People Ops",          icon: HeartHandshake, tint: "text-fuchsia-500 bg-fuchsia-500/10" },
  { key: "bug",             label: "Report a bug",      team: "Engineering",         icon: Bug,            tint: "text-orange-500 bg-orange-500/10" },
  { key: "technical",       label: "Technical issue",   team: "Engineering",         icon: Wrench,         tint: "text-orange-500 bg-orange-500/10" },
  { key: "feature_request", label: "Feature request",   team: "Engineering",         icon: MessageSquare,  tint: "text-indigo-500 bg-indigo-500/10" },
  { key: "organization",    label: "Organization help", team: "Organizations",       icon: Users,          tint: "text-cyan-500 bg-cyan-500/10" },
  { key: "creator",         label: "Creator support",   team: "Creator Success",     icon: Users,          tint: "text-pink-500 bg-pink-500/10" },
  { key: "other",           label: "Something else",    team: "Support",             icon: MessageSquare,  tint: "text-muted-foreground bg-muted" },
];

const PRIORITY_LABEL: Record<string, string> = {
  low: "Low", medium: "Normal", high: "High", critical: "Urgent",
};

const STATUS_TONE: Record<string, string> = {
  open:        "text-blue-500 bg-blue-500/10",
  in_progress: "text-amber-500 bg-amber-500/10",
  pending:     "text-amber-500 bg-amber-500/10",
  resolved:    "text-emerald-500 bg-emerald-500/10",
  closed:      "text-muted-foreground bg-muted",
};

const Support = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [category, setCategory] = useState<Category | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");

  const { data: tickets } = useQuery({
    enabled: !!user?.id,
    queryKey: ["my-support-tickets", user?.id],
    queryFn: async () => {
      try {
        // 1. Check Firestore
        const { collection, query, where, orderBy, limit, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const q = query(
          collection(db, "support_tickets"),
          where("requester_id", "==", user!.id),
          orderBy("created_at", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("Firestore support tickets fetch failed", e);
      }

      // 2. Supabase Fallback.
      const { data, error } = await supabase.from("sup_tickets" as any).select("id, ticket_number, subject, category, priority, status, created_at, owning_department_id").eq("requester_id", user!.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first.");
      if (!category) throw new Error("Pick a topic first.");
      if (!subject.trim()) throw new Error("Please add a short subject.");
      
      const payload = {
        subject: subject.trim(),
        description: description.trim() || null,
        category: category.key,
        priority,
        source: "user",
        requester_id: user.uid,
        requester_display: user.email ?? null,
      };

      try {
        // 1. Dual-write to Firestore
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        await addDoc(collection(db, "support_tickets"), {
          ...payload,
          created_at: serverTimestamp(),
          status: "open",
          ticket_number: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        });
      } catch (e) {
        console.warn("Firestore ticket creation failed", e);
      }

      // 2. Supabase Insert (Legacy/Back-office)
      const { data, error } = await supabase.rpc("create_support_ticket" as any, payload as any);
      if (error) throw error;
      return data as unknown as { ticket_number: string };

    },
    onSuccess: (d) => {
      toast.success(`Sent to ${category?.team}. Ticket #${d?.ticket_number}`);
      setSubject(""); setDescription(""); setCategory(null); setPriority("medium");
      qc.invalidateQueries({ queryKey: ["my-support-tickets"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send your request."),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" /> Help & Support
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us what you need — your request goes straight to the right team.
        </p>
      </header>

      {/* Category picker */}
      {!category && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            What do you need help with?
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c)}
                className="text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/50 p-3 transition-colors flex items-start gap-3"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.tint}`}>
                  <c.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">→ {c.team}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Form */}
      {category && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <button
            onClick={() => setCategory(null)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Change topic
          </button>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${category.tint}`}>
            <category.icon className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {category.label} · sent to {category.team}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={140}
              placeholder="One line summary"
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Describe the issue
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Steps you took, what you expected, what happened…"
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="mt-1 text-[10px] text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              How urgent?
            </label>
            <div className="flex gap-2 flex-wrap">
              {(["low","medium","high","critical"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    priority === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !subject.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submit.isPending ? "Sending…" : `Send to ${category.team}`}
          </button>
        </section>
      )}

      {/* My past tickets */}
      {tickets && tickets.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Your recent requests
          </p>
          <div className="space-y-2">
            {tickets.map((t: any) => {
              const cat = CATEGORIES.find((c) => c.key === t.category);
              const Icon = cat?.icon ?? MessageSquare;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-3 flex items-start gap-3"
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cat?.tint ?? "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {t.subject}
                      </p>
                      <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${STATUS_TONE[t.status] ?? "bg-muted"}`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono">{t.ticket_number}</span>
                      <span>·</span>
                      <span>{cat?.team ?? "Support"}</span>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(!tickets || tickets.length === 0) && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
          <p className="mt-2 text-sm font-semibold text-foreground">No open tickets</p>
          <p className="text-xs text-muted-foreground">
            When you send a request it will show up here with live status.
          </p>
        </div>
      )}
    </div>
  );
};

export default Support;
