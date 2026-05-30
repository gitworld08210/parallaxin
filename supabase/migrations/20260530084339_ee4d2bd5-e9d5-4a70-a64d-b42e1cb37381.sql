
-- Roles system
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admin can see/update all verification_requests
CREATE POLICY "vr_admin_select" ON public.verification_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vr_admin_update" ON public.verification_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Founder applications
CREATE TABLE public.founder_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  chronicle text NOT NULL,
  why text NOT NULL,
  desired_role public.council_role,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.founder_applications TO authenticated;
GRANT ALL ON public.founder_applications TO service_role;

ALTER TABLE public.founder_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fa_insert_own" ON public.founder_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fa_select_own_or_admin" ON public.founder_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fa_admin_update" ON public.founder_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all reports
CREATE POLICY "reports_admin_select" ON public.reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_published_created ON public.posts (created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories (expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.likes (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages (conversation_id, created_at DESC);

-- Seed: first signed-up account becomes admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('2d8bda29-9d97-40f6-a6e7-f6cfec787f50', 'admin')
ON CONFLICT DO NOTHING;
