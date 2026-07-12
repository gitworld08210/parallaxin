import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SupPriority = "critical" | "high" | "medium" | "low";
export type SupStatus =
  | "open" | "assigned" | "in_progress" | "waiting_customer" | "waiting_internal"
  | "escalated" | "resolved" | "closed" | "reopened";
export type SupCategory =
  | "account" | "verification" | "trust_safety" | "technical" | "billing"
  | "creator" | "organization" | "bug" | "feature_request" | "appeal"
  | "it" | "hr" | "other";
export type SupSource =
  | "user" | "creator" | "organization" | "employee" | "verification"
  | "trust_safety" | "founder_office" | "system" | "api";

export function useTickets(filters?: { status?: SupStatus; priority?: SupPriority }) {
  return useQuery({
    queryKey: ["sup-tickets", filters],
    queryFn: async () => {
      let q = supabase.from("sup_tickets").select("*").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.priority) q = q.eq("priority", filters.priority);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTicket(id?: string) {
  return useQuery({
    queryKey: ["sup-ticket", id],
    enabled: !!id,
    queryFn: async () => {
      const [t, m, n, e, h, s] = await Promise.all([
        supabase.from("sup_tickets").select("*").eq("id", id!).maybeSingle(),
        supabase.from("sup_messages").select("*").eq("ticket_id", id!).order("created_at"),
        supabase.from("sup_notes").select("*").eq("ticket_id", id!).order("created_at"),
        supabase.from("sup_escalations").select("*").eq("ticket_id", id!).order("created_at"),
        supabase.from("sup_history").select("*").eq("ticket_id", id!).order("created_at", { ascending: false }),
        supabase.from("sup_sla_events").select("*").eq("ticket_id", id!).order("created_at", { ascending: false }),
      ]);
      if (t.error) throw t.error;
      return {
        ticket: t.data,
        messages: m.data ?? [],
        notes: n.data ?? [],
        escalations: e.data ?? [],
        history: h.data ?? [],
        sla: s.data ?? [],
      };
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      description?: string;
      category: SupCategory;
      priority: SupPriority;
      source?: SupSource;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!input.subject.trim()) throw new Error("Subject required");
      const { data, error } = await supabase.from("sup_tickets").insert({
        subject: input.subject,
        description: input.description,
        category: input.category,
        priority: input.priority,
        source: input.source ?? "user",
        requester_id: u.user?.id,
        requester_display: u.user?.email,
        ticket_number: "",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket created");
      qc.invalidateQueries({ queryKey: ["sup-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<{ status: SupStatus; priority: SupPriority; assignee_id: string | null; sla_paused: boolean }> }) => {
      const { error } = await supabase.from("sup_tickets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["sup-tickets"] });
      qc.invalidateQueries({ queryKey: ["sup-ticket", v.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket_id, body, author_role }: { ticket_id: string; body: string; author_role: "customer" | "agent" }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!body.trim()) throw new Error("Message required");
      const { error } = await supabase.from("sup_messages").insert({
        ticket_id, body, author_role, author_id: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["sup-ticket", v.ticket_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket_id, body, note_type }: { ticket_id: string; body: string; note_type: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!body.trim()) throw new Error("Note required");
      const { error } = await supabase.from("sup_notes").insert({
        ticket_id, body, note_type, author_id: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ["sup-ticket", v.ticket_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEscalate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket_id, target_department_key, reason }: { ticket_id: string; target_department_key: string; reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!reason.trim()) throw new Error("Reason required");
      const { data: to } = await supabase.from("admin_departments").select("id").eq("key", target_department_key).maybeSingle();
      const { error } = await supabase.from("sup_escalations").insert({
        ticket_id, target_department_key, reason,
        to_department_id: to?.id ?? null,
        escalated_by: u.user?.id,
      });
      if (error) throw error;
      await supabase.from("sup_tickets").update({ status: "escalated" }).eq("id", ticket_id);
    },
    onSuccess: (_r, v) => {
      toast.success("Ticket escalated");
      qc.invalidateQueries({ queryKey: ["sup-ticket", v.ticket_id] });
      qc.invalidateQueries({ queryKey: ["sup-tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket_id, paused, policy_ref }: { ticket_id: string; paused: boolean; policy_ref: string }) => {
      if (!policy_ref.trim()) throw new Error("Policy reference required to pause/resume SLA");
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("sup_tickets").update({ sla_paused: paused }).eq("id", ticket_id);
      const { error } = await supabase.from("sup_sla_events").insert({
        ticket_id, event_type: paused ? "sla_paused" : "sla_resumed",
        actor_id: u.user?.id, policy_ref,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ["sup-ticket", v.ticket_id] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticket_id, rating, comment, suggestions }: { ticket_id: string; rating: number; comment?: string; suggestions?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("sup_feedback").insert({
        ticket_id, rating, comment, suggestions, submitted_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      toast.success("Feedback submitted");
      qc.invalidateQueries({ queryKey: ["sup-ticket", v.ticket_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
