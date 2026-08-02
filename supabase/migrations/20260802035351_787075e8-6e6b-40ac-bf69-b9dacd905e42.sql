CREATE TABLE IF NOT EXISTS public.internal_job_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.internal_job_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_job_tokens TO service_role;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access" ON public.internal_job_tokens FOR ALL TO authenticated USING (false) WITH CHECK (false);

INSERT INTO public.internal_job_tokens (name) VALUES ('cron') ON CONFLICT (name) DO NOTHING;

SELECT cron.unschedule('aap-generate-invoices-daily');

SELECT cron.schedule(
  'aap-generate-invoices-daily',
  '0 3 * * *',
  format($cmd$
    select net.http_post(
      url:='https://xmztbdaupkvezhhokmwx.supabase.co/functions/v1/aap-generate-invoices',
      headers:='{"Content-Type":"application/json","apikey":"sb_publishable_LO4xQGLhU0aM8Un2LwMNDA_jv4U6ZPz","Authorization":"Bearer %s"}'::jsonb,
      body:='{}'::jsonb
    );
  $cmd$, (SELECT token FROM public.internal_job_tokens WHERE name = 'cron'))
);