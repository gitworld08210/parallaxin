import { reliableInvoke } from "@/lib/reliableInvoke";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";

export type KipCollection = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  department: string | null;
  visibility: "private" | "shared" | "company";
  icon: string | null;
  color: string | null;
  owner_id: string;
  is_archived: boolean;
  document_count: number;
  created_at: string;
  updated_at: string;
};

export type KipDocument = {
  id: string;
  collection_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  document_type: string;
  status: "pending" | "indexing" | "indexed" | "failed" | "archived";
  indexing_error: string | null;
  current_version: number;
  chunk_count: number;
  tags: string[];
  uploaded_by: string;
  content_preview: string | null;
  indexed_at: string | null;
  created_at: string;
};

export type KipConversation = {
  id: string;
  owner_id: string;
  title: string;
  collection_id: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  document_ids: string[];
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type KipMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  is_saved: boolean;
  confidence: string | null;
  metadata: any;
  created_at: string;
};

export type KipCitation = {
  id: string;
  message_id: string;
  document_id: string;
  chunk_id: string | null;
  section: string | null;
  version_number: number | null;
  relevance: number | null;
  snippet: string | null;
};

// ---------- Collections ----------
export function useKipCollections() {
  return useQuery({
    queryKey: ["kip", "collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kip_collections" as any)
        .select("*")
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as KipCollection[];
    },
  });
}

export function useKipCollection(id?: string) {
  return useQuery({
    queryKey: ["kip", "collection", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_collections" as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data as unknown) as KipCollection | null;
    },
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<KipCollection> & { name: string }) => {
      const payload = { ...input, owner_id: user!.id };
      const { data, error } = await supabase.from("kip_collections" as any).insert(payload as any).select("*").single();
      if (error) throw error;
      return data as unknown as KipCollection;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kip", "collections"] }),
  });
}

// ---------- Documents ----------
export function useKipDocuments(collectionId?: string) {
  return useQuery({
    queryKey: ["kip", "documents", collectionId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("kip_documents" as any).select("*").eq("is_deleted", false).order("created_at", { ascending: false });
      if (collectionId) q = q.eq("collection_id", collectionId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown) as KipDocument[];
    },
  });
}

export function useKipDocument(id?: string) {
  return useQuery({
    queryKey: ["kip", "document", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_documents" as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data as unknown) as KipDocument | null;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      collection_id: string;
      title: string;
      description?: string;
      document_type?: string;
      file?: File;
      raw_text?: string;
      tags?: string[];
    }) => {
      let file_path: string | null = null;
      let file_type: string | null = null;
      let file_size: number | null = null;
      let file_name: string | null = null;
      if (input.file) {
        const ext = input.file.name.split(".").pop() ?? "bin";
        file_path = `${user!.id}/${input.collection_id}/${crypto.randomUUID()}.${ext}`;
        file_name = input.file.name;
        file_type = input.file.type || ext;
        file_size = input.file.size;
        const up = await supabase.storage.from("kip-documents").upload(file_path, input.file, {
          contentType: input.file.type || undefined, upsert: false,
        });
        if (up.error) throw up.error;
      }
      const insertPayload: any = {
        collection_id: input.collection_id,
        title: input.title,
        description: input.description ?? null,
        document_type: input.document_type ?? "general",
        tags: input.tags ?? [],
        uploaded_by: user!.id,
        file_path, file_name, file_type, file_size,
        status: "pending",
        metadata: input.raw_text ? { raw_text: input.raw_text } : {},
      };
      const { data: doc, error } = await supabase.from("kip_documents" as any).insert(insertPayload).select("*").single();
      if (error) throw error;

      // Kick off indexing — awaited via reliableInvoke, failures logged (Phase 0).
      void reliableInvoke("kip-index", { body: { documentId: (doc as any).id }, retries: 2 });
      return doc as unknown as KipDocument;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["kip", "documents"] });
      qc.invalidateQueries({ queryKey: ["kip", "collections"] });
      qc.invalidateQueries({ queryKey: ["kip", "document", doc.id] });
    },
  });
}

export function useReindexDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase.functions.invoke("kip-index", { body: { documentId } });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kip", "documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase.from("kip_documents" as any).update({ is_deleted: true } as any).eq("id", documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kip", "documents"] });
      qc.invalidateQueries({ queryKey: ["kip", "collections"] });
    },
  });
}

// ---------- Conversations ----------
export function useKipConversations() {
  return useQuery({
    queryKey: ["kip", "conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_conversations" as any).select("*").eq("is_archived", false).order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data as unknown) as KipConversation[];
    },
  });
}

export function useKipMessages(conversationId?: string) {
  return useQuery({
    queryKey: ["kip", "messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_conversation_messages" as any).select("*").eq("conversation_id", conversationId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown) as KipMessage[];
    },
  });
}

export function useKipCitations(messageIds: string[]) {
  return useQuery({
    queryKey: ["kip", "citations", messageIds.sort().join(",")],
    enabled: messageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_citations" as any).select("*").in("message_id", messageIds);
      if (error) throw error;
      return (data as unknown) as KipCitation[];
    },
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title?: string; collection_id?: string | null; document_ids?: string[] }) => {
      const { data, error } = await supabase.from("kip_conversations" as any).insert({
        owner_id: user!.id,
        title: input.title ?? "New conversation",
        collection_id: input.collection_id ?? null,
        document_ids: input.document_ids ?? [],
      } as any).select("*").single();
      if (error) throw error;
      return data as unknown as KipConversation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kip", "conversations"] }),
  });
}

export function useTogglePinConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("kip_conversations" as any).update({ is_pinned: pinned } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kip", "conversations"] }),
  });
}

// ---------- Bookmarks ----------
export function useKipBookmarks() {
  return useQuery({
    queryKey: ["kip", "bookmarks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_bookmarks" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useAddBookmark() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { target_type: string; target_id: string; label?: string; note?: string }) => {
      const { error } = await supabase.from("kip_bookmarks" as any).insert({ ...input, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kip", "bookmarks"] }),
  });
}

export function useRemoveBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kip_bookmarks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kip", "bookmarks"] }),
  });
}

// ---------- Versions ----------
export function useDocumentVersions(documentId?: string) {
  return useQuery({
    queryKey: ["kip", "versions", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("kip_document_versions" as any).select("*").eq("document_id", documentId!).order("version_number", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

// ---------- Search ----------
export type KipSearchResult = {
  id: string; document_id: string; collection_id: string; chunk_index: number;
  content: string; section: string | null; similarity: number;
  document: { id: string; title: string; current_version: number; collection_id: string; document_type: string } | null;
};

export function useKipSearch() {
  return useMutation({
    mutationFn: async (input: { query: string; collectionIds?: string[]; documentIds?: string[]; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke("kip-search", { body: input });
      if (error) throw error;
      return (data as any).results as KipSearchResult[];
    },
  });
}

// ---------- Storage helpers ----------
export async function getDocumentSignedUrl(path: string, expiresIn = 300) {
  const { data, error } = await supabase.storage.from("kip-documents").createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
