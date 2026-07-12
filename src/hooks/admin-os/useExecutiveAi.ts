import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const logAudit = async (action: string, resource: string, resourceId: string | null, details: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_audit_logs").insert({
    action, resource_type: resource, resource_id: resourceId,
    user_id: user.id, details, severity: "info",
  } as any);
};

/* ============ Conversations ============ */
export const useAiConversations = () =>
  useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_ai_conversations")
        .select("*").order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAiConversation = (id?: string) =>
  useQuery({
    queryKey: ["ai-conversation", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_ai_conversations")
        .select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useAiMessages = (conversationId?: string) =>
  useQuery({
    queryKey: ["ai-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_ai_messages")
        .select("*").eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useCreateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("executive_ai_conversations")
        .insert({ title: title ?? "New conversation", owner_id: user.id }).select().single();
      if (error) throw error;
      await logAudit("ai.conversation.create", "executive_ai_conversation", data.id, {});
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });
};

export const useDeleteConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_ai_conversations").delete().eq("id", id);
      if (error) throw error;
      await logAudit("ai.conversation.delete", "executive_ai_conversation", id, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversation removed");
    },
  });
};

export const useUpdateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { data, error } = await supabase.from("executive_ai_conversations")
        .update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });
};

export const insertAiMessage = async (conversationId: string, role: string, content: string, extra?: any) => {
  const { data, error } = await supabase.from("executive_ai_messages").insert({
    conversation_id: conversationId, role, content, ...(extra ?? {}),
  }).select().single();
  if (error) throw error;
  await supabase.from("executive_ai_conversations")
    .update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
  return data;
};

/* ============ Streaming chat ============ */
export const streamExecutiveAi = async (params: {
  conversationId?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
  context?: string;
  onDelta: (delta: string) => void;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/executive-ai`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages: params.messages, conversationId: params.conversationId,
      model: params.model, context: params.context,
    }),
  });
  if (!resp.ok) {
    let msg = `AI request failed (${resp.status})`;
    try { const j = await resp.json(); msg = j.error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta?.content ?? "";
        if (delta) { full += delta; params.onDelta(delta); }
      } catch { /* ignore keepalives */ }
    }
  }
  return full;
};

/* ============ Recommendations ============ */
export const useAiRecommendations = (status?: string) =>
  useQuery({
    queryKey: ["ai-recommendations", status ?? "all"],
    queryFn: async () => {
      let q = supabase.from("executive_ai_recommendations").select("*").order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSaveRecommendation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const isUpdate = !!payload.id;
      const row = { ...payload, ...(isUpdate ? {} : { created_by: user?.id }) };
      const { data, error } = isUpdate
        ? await supabase.from("executive_ai_recommendations").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_ai_recommendations").insert(row).select().single();
      if (error) throw error;
      await logAudit(isUpdate ? "ai.rec.update" : "ai.rec.create", "ai_recommendation", data.id, {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-recommendations"] });
      toast.success("Recommendation saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

export const useReviewRecommendation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("executive_ai_recommendations")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await logAudit("ai.rec.review", "ai_recommendation", id, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-recommendations"] });
      toast.success("Recommendation updated");
    },
  });
};

/* ============ Predictions ============ */
export const useAiPredictions = () =>
  useQuery({
    queryKey: ["ai-predictions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_ai_predictions")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSavePrediction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("executive_ai_predictions")
        .insert({ ...payload, created_by: user?.id }).select().single();
      if (error) throw error;
      await logAudit("ai.prediction.create", "ai_prediction", data.id, { metric: data.metric });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-predictions"] });
      toast.success("Prediction saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
};

/* ============ Saved prompts ============ */
export const useSavedPrompts = () =>
  useQuery({
    queryKey: ["ai-saved-prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("executive_ai_saved_prompts")
        .select("*").order("category").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

export const useSavePrompt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const isUpdate = !!payload.id;
      const row = { ...payload, ...(isUpdate ? {} : { owner_id: user.id }) };
      const { data, error } = isUpdate
        ? await supabase.from("executive_ai_saved_prompts").update(row).eq("id", payload.id).select().single()
        : await supabase.from("executive_ai_saved_prompts").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-saved-prompts"] });
      toast.success("Prompt saved");
    },
  });
};

export const useDeletePrompt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("executive_ai_saved_prompts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-saved-prompts"] }),
  });
};

/* ============ Feedback ============ */
export const useSubmitFeedback = () => {
  return useMutation({
    mutationFn: async ({ messageId, rating, comment }: { messageId: string; rating: "up" | "down"; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("executive_ai_feedback").insert({
        message_id: messageId, user_id: user.id, rating, comment,
      });
      if (error) throw error;
      await logAudit("ai.feedback", "ai_message", messageId, { rating });
    },
    onSuccess: () => toast.success("Feedback recorded"),
  });
};

/* ============ Knowledge Search ============ */
export const searchKnowledge = async (query: string) => {
  const q = `%${query}%`;
  const [policies, decisions, reports, config] = await Promise.all([
    supabase.from("governance_policies").select("id,title,summary,category").ilike("title", q).limit(10),
    supabase.from("strategic_decisions").select("id,title,summary,status").ilike("title", q).limit(10),
    supabase.from("department_periodic_reports").select("id,title,department_id,period_type").ilike("title", q).limit(10),
    supabase.from("company_configurations").select("id,category,key,description").or(`key.ilike.${q},description.ilike.${q}`).limit(10),
  ]);
  return {
    policies: policies.data ?? [],
    decisions: decisions.data ?? [],
    reports: reports.data ?? [],
    configurations: config.data ?? [],
  };
};
