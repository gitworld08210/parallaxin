
-- KIP: Knowledge Intelligence Platform
CREATE EXTENSION IF NOT EXISTS vector;

-- Collections
CREATE TABLE public.kip_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  department TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared','company')),
  icon TEXT,
  color TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  document_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_collections TO authenticated;
GRANT ALL ON public.kip_collections TO service_role;

-- Membership
CREATE TABLE public.kip_collection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.kip_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'viewer' CHECK (access_level IN ('viewer','editor','owner')),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_collection_members TO authenticated;
GRANT ALL ON public.kip_collection_members TO service_role;

-- Access helper (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.kip_can_access_collection(_collection_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kip_collections c
    WHERE c.id = _collection_id AND (
      c.owner_id = _user_id
      OR c.visibility = 'company'
      OR EXISTS (SELECT 1 FROM public.kip_collection_members m WHERE m.collection_id = c.id AND m.user_id = _user_id)
      OR public.is_admin_department_member(_user_id, 'founder_office')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.kip_can_edit_collection(_collection_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.kip_collections c
    WHERE c.id = _collection_id AND (
      c.owner_id = _user_id
      OR EXISTS (SELECT 1 FROM public.kip_collection_members m WHERE m.collection_id = c.id AND m.user_id = _user_id AND m.access_level IN ('editor','owner'))
      OR public.is_admin_department_member(_user_id, 'founder_office')
    )
  );
$$;

-- Documents
CREATE TABLE public.kip_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.kip_collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  document_type TEXT NOT NULL DEFAULT 'general' CHECK (document_type IN ('policy','sop','handbook','minutes','decision','audit','report','technical','general')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','indexing','indexed','failed','archived')),
  indexing_error TEXT,
  current_version INT NOT NULL DEFAULT 1,
  chunk_count INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  content_preview TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kip_documents_collection_idx ON public.kip_documents(collection_id) WHERE NOT is_deleted;
CREATE INDEX kip_documents_status_idx ON public.kip_documents(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_documents TO authenticated;
GRANT ALL ON public.kip_documents TO service_role;

-- Versions
CREATE TABLE public.kip_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kip_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_path TEXT,
  file_size BIGINT,
  change_summary TEXT,
  content_preview TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_document_versions TO authenticated;
GRANT ALL ON public.kip_document_versions TO service_role;

-- Chunks with embeddings (1536-dim for openai/text-embedding-3-small — HNSW compatible)
CREATE TABLE public.kip_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kip_documents(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.kip_collections(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_count INT,
  section TEXT,
  embedding vector(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kip_chunks_document_idx ON public.kip_document_chunks(document_id);
CREATE INDEX kip_chunks_embedding_idx ON public.kip_document_chunks USING hnsw (embedding vector_cosine_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_document_chunks TO authenticated;
GRANT ALL ON public.kip_document_chunks TO service_role;

-- Conversations
CREATE TABLE public.kip_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  department TEXT,
  collection_id UUID REFERENCES public.kip_collections(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  document_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_conversations TO authenticated;
GRANT ALL ON public.kip_conversations TO service_role;

-- Messages
CREATE TABLE public.kip_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.kip_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  confidence TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kip_messages_conv_idx ON public.kip_conversation_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_conversation_messages TO authenticated;
GRANT ALL ON public.kip_conversation_messages TO service_role;

-- Citations
CREATE TABLE public.kip_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.kip_conversation_messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.kip_documents(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES public.kip_document_chunks(id) ON DELETE SET NULL,
  section TEXT,
  version_number INT,
  relevance NUMERIC(4,3),
  snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kip_citations_message_idx ON public.kip_citations(message_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_citations TO authenticated;
GRANT ALL ON public.kip_citations TO service_role;

-- Bookmarks
CREATE TABLE public.kip_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('document','message','conversation','collection','chunk')),
  target_id UUID NOT NULL,
  label TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_bookmarks TO authenticated;
GRANT ALL ON public.kip_bookmarks TO service_role;

-- Search history
CREATE TABLE public.kip_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  collection_id UUID REFERENCES public.kip_collections(id) ON DELETE SET NULL,
  result_count INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kip_search_history TO authenticated;
GRANT ALL ON public.kip_search_history TO service_role;

-- Enable RLS
ALTER TABLE public.kip_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_collection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kip_search_history ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "kip_col_read" ON public.kip_collections FOR SELECT TO authenticated
USING (public.kip_can_access_collection(id, auth.uid()));
CREATE POLICY "kip_col_insert" ON public.kip_collections FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE POLICY "kip_col_update" ON public.kip_collections FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'))
WITH CHECK (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'));
CREATE POLICY "kip_col_delete" ON public.kip_collections FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(), 'founder_office'));

-- Members policies
CREATE POLICY "kip_mem_read" ON public.kip_collection_members FOR SELECT TO authenticated
USING (public.kip_can_access_collection(collection_id, auth.uid()));
CREATE POLICY "kip_mem_write" ON public.kip_collection_members FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.kip_collections c WHERE c.id = collection_id AND (c.owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.kip_collections c WHERE c.id = collection_id AND (c.owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))));

-- Documents policies
CREATE POLICY "kip_doc_read" ON public.kip_documents FOR SELECT TO authenticated
USING (NOT is_deleted AND public.kip_can_access_collection(collection_id, auth.uid()));
CREATE POLICY "kip_doc_insert" ON public.kip_documents FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND public.kip_can_edit_collection(collection_id, auth.uid()));
CREATE POLICY "kip_doc_update" ON public.kip_documents FOR UPDATE TO authenticated
USING (public.kip_can_edit_collection(collection_id, auth.uid()))
WITH CHECK (public.kip_can_edit_collection(collection_id, auth.uid()));
CREATE POLICY "kip_doc_delete" ON public.kip_documents FOR DELETE TO authenticated
USING (public.kip_can_edit_collection(collection_id, auth.uid()));

-- Versions
CREATE POLICY "kip_ver_read" ON public.kip_document_versions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.kip_documents d WHERE d.id = document_id AND public.kip_can_access_collection(d.collection_id, auth.uid())));
CREATE POLICY "kip_ver_write" ON public.kip_document_versions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.kip_documents d WHERE d.id = document_id AND public.kip_can_edit_collection(d.collection_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.kip_documents d WHERE d.id = document_id AND public.kip_can_edit_collection(d.collection_id, auth.uid())));

-- Chunks (read only via RLS; writes performed by edge functions using service role)
CREATE POLICY "kip_chunk_read" ON public.kip_document_chunks FOR SELECT TO authenticated
USING (public.kip_can_access_collection(collection_id, auth.uid()));

-- Conversations
CREATE POLICY "kip_conv_owner_all" ON public.kip_conversations FOR ALL TO authenticated
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "kip_conv_founder_read" ON public.kip_conversations FOR SELECT TO authenticated
USING (public.is_admin_department_member(auth.uid(),'founder_office'));

-- Messages
CREATE POLICY "kip_msg_owner_all" ON public.kip_conversation_messages FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.kip_conversations c WHERE c.id = conversation_id AND c.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.kip_conversations c WHERE c.id = conversation_id AND c.owner_id = auth.uid()));
CREATE POLICY "kip_msg_founder_read" ON public.kip_conversation_messages FOR SELECT TO authenticated
USING (public.is_admin_department_member(auth.uid(),'founder_office'));

-- Citations
CREATE POLICY "kip_cite_read" ON public.kip_citations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.kip_conversation_messages m JOIN public.kip_conversations c ON c.id = m.conversation_id WHERE m.id = message_id AND (c.owner_id = auth.uid() OR public.is_admin_department_member(auth.uid(),'founder_office'))));

-- Bookmarks
CREATE POLICY "kip_bm_owner" ON public.kip_bookmarks FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Search history
CREATE POLICY "kip_sh_owner" ON public.kip_search_history FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER kip_col_upd BEFORE UPDATE ON public.kip_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER kip_doc_upd BEFORE UPDATE ON public.kip_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER kip_conv_upd BEFORE UPDATE ON public.kip_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: semantic match
CREATE OR REPLACE FUNCTION public.kip_match_chunks(
  query_embedding vector(1536),
  match_count INT DEFAULT 8,
  filter_collection_ids UUID[] DEFAULT NULL,
  filter_document_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
  id UUID, document_id UUID, collection_id UUID, chunk_index INT,
  content TEXT, section TEXT, similarity FLOAT
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id, c.document_id, c.collection_id, c.chunk_index, c.content, c.section,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.kip_document_chunks c
  JOIN public.kip_documents d ON d.id = c.document_id AND NOT d.is_deleted AND d.status = 'indexed'
  WHERE public.kip_can_access_collection(c.collection_id, auth.uid())
    AND (filter_collection_ids IS NULL OR c.collection_id = ANY(filter_collection_ids))
    AND (filter_document_ids IS NULL OR c.document_id = ANY(filter_document_ids))
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Trigger: keep document_count in sync
CREATE OR REPLACE FUNCTION public.kip_bump_collection_counts()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.kip_collections SET document_count = document_count + 1 WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.kip_collections SET document_count = GREATEST(document_count - 1, 0) WHERE id = OLD.collection_id;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER kip_doc_count_trg AFTER INSERT OR DELETE ON public.kip_documents
FOR EACH ROW EXECUTE FUNCTION public.kip_bump_collection_counts();

-- Storage policies for private kip-documents bucket
CREATE POLICY "kip_storage_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kip-documents' AND EXISTS (
    SELECT 1 FROM public.kip_documents d
    WHERE d.file_path = storage.objects.name
      AND public.kip_can_access_collection(d.collection_id, auth.uid())
  )
);
CREATE POLICY "kip_storage_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kip-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "kip_storage_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'kip-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "kip_storage_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kip-documents' AND auth.uid() IS NOT NULL);
