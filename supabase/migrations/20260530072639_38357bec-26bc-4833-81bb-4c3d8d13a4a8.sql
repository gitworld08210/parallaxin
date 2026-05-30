
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.story_highlights TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.story_highlights TO authenticated;
GRANT ALL ON public.story_highlights TO service_role;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY sh_select_all ON public.story_highlights FOR SELECT USING (true);
CREATE POLICY sh_owner_write ON public.story_highlights FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.highlight_items (
  highlight_id uuid NOT NULL REFERENCES public.story_highlights(id) ON DELETE CASCADE,
  story_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id, story_id)
);
GRANT SELECT ON public.highlight_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.highlight_items TO authenticated;
GRANT ALL ON public.highlight_items TO service_role;
ALTER TABLE public.highlight_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY hi_select_all ON public.highlight_items FOR SELECT USING (true);
CREATE POLICY hi_owner_write ON public.highlight_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.story_highlights h WHERE h.id = highlight_id AND h.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.story_highlights h WHERE h.id = highlight_id AND h.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = _conversation_id AND cp.user_id = auth.uid()
    );
END $$;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
