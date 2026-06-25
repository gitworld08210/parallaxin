
CREATE TABLE public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','ended')),
  livekit_room TEXT NOT NULL UNIQUE,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX live_streams_status_idx ON public.live_streams(status, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;
GRANT ALL ON public.live_streams TO service_role;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view live streams" ON public.live_streams FOR SELECT TO authenticated USING (true);
CREATE POLICY "host creates stream" ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "host updates stream" ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "host deletes stream" ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE TABLE public.live_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX live_chat_stream_idx ON public.live_chat(stream_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.live_chat TO authenticated;
GRANT ALL ON public.live_chat TO service_role;
ALTER TABLE public.live_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view chat" ON public.live_chat FOR SELECT TO authenticated USING (true);
CREATE POLICY "post chat" ON public.live_chat FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own chat" ON public.live_chat FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX live_reactions_stream_idx ON public.live_reactions(stream_id, created_at);
GRANT SELECT, INSERT ON public.live_reactions TO authenticated;
GRANT ALL ON public.live_reactions TO service_role;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view reactions" ON public.live_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "send reaction" ON public.live_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;
