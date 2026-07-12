
DO $$ BEGIN
  CREATE TYPE sup_priority AS ENUM ('critical','high','medium','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sup_status AS ENUM (
    'open','assigned','in_progress','waiting_customer','waiting_internal',
    'escalated','resolved','closed','reopened'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sup_source AS ENUM (
    'user','creator','organization','employee','verification','trust_safety',
    'founder_office','system','api'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sup_category AS ENUM (
    'account','verification','trust_safety','technical','billing','creator',
    'organization','bug','feature_request','appeal','it','hr','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.is_support_staff(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.admin_departments d ON d.id = e.department_id
      WHERE e.user_id = _user
        AND e.employment_status = 'active'
        AND d.key IN ('support','founder_office')
    );
$$;

CREATE TABLE public.sup_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  subject text NOT NULL,
  description text,
  category sup_category NOT NULL DEFAULT 'other',
  priority sup_priority NOT NULL DEFAULT 'medium',
  status sup_status NOT NULL DEFAULT 'open',
  source sup_source NOT NULL DEFAULT 'user',
  requester_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_display text,
  owning_department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_response_due_at timestamptz,
  resolution_due_at timestamptz,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  reopened_at timestamptz,
  sla_paused boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sup_tickets TO authenticated;
GRANT ALL ON public.sup_tickets TO service_role;
ALTER TABLE public.sup_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_tickets_staff_all" ON public.sup_tickets
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid()))
  WITH CHECK (public.is_support_staff(auth.uid()));
CREATE POLICY "sup_tickets_requester_read" ON public.sup_tickets
  FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "sup_tickets_requester_create" ON public.sup_tickets
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE INDEX sup_tickets_status_idx ON public.sup_tickets(status);
CREATE INDEX sup_tickets_prio_idx ON public.sup_tickets(priority);
CREATE INDEX sup_tickets_requester_idx ON public.sup_tickets(requester_id);
CREATE INDEX sup_tickets_assignee_idx ON public.sup_tickets(assignee_id);

CREATE TABLE public.sup_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sup_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role text NOT NULL DEFAULT 'customer',
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sup_messages TO authenticated;
GRANT ALL ON public.sup_messages TO service_role;
ALTER TABLE public.sup_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_msg_staff_all" ON public.sup_messages
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid()))
  WITH CHECK (public.is_support_staff(auth.uid()));
CREATE POLICY "sup_msg_requester_read" ON public.sup_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sup_tickets t WHERE t.id = sup_messages.ticket_id AND t.requester_id = auth.uid())
  );
CREATE POLICY "sup_msg_requester_insert" ON public.sup_messages
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.sup_tickets t WHERE t.id = ticket_id AND t.requester_id = auth.uid())
  );

CREATE TABLE public.sup_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sup_tickets(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'investigation',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sup_notes TO authenticated;
GRANT ALL ON public.sup_notes TO service_role;
ALTER TABLE public.sup_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_notes_staff_all" ON public.sup_notes
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid()))
  WITH CHECK (public.is_support_staff(auth.uid()));

CREATE TABLE public.sup_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sup_tickets(id) ON DELETE CASCADE,
  from_department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES public.admin_departments(id) ON DELETE SET NULL,
  target_department_key text NOT NULL,
  reason text NOT NULL,
  escalated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sup_escalations TO authenticated;
GRANT ALL ON public.sup_escalations TO service_role;
ALTER TABLE public.sup_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_esc_staff_all" ON public.sup_escalations
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid()))
  WITH CHECK (public.is_support_staff(auth.uid()));

CREATE TABLE public.sup_sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sup_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  policy_ref text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sup_sla_events TO authenticated;
GRANT ALL ON public.sup_sla_events TO service_role;
ALTER TABLE public.sup_sla_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_sla_staff_all" ON public.sup_sla_events
  FOR ALL TO authenticated USING (public.is_support_staff(auth.uid()))
  WITH CHECK (public.is_support_staff(auth.uid()));

CREATE TABLE public.sup_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sup_tickets(id) ON DELETE RESTRICT,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  suggestions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sup_feedback TO authenticated;
GRANT ALL ON public.sup_feedback TO service_role;
ALTER TABLE public.sup_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_fb_staff_read" ON public.sup_feedback
  FOR SELECT TO authenticated USING (public.is_support_staff(auth.uid()));
CREATE POLICY "sup_fb_requester_read" ON public.sup_feedback
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "sup_fb_requester_insert" ON public.sup_feedback
  FOR INSERT TO authenticated WITH CHECK (
    submitted_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.sup_tickets t WHERE t.id = ticket_id
      AND t.requester_id = auth.uid() AND t.status IN ('resolved','closed'))
  );

CREATE TABLE public.sup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.sup_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sup_history TO authenticated;
GRANT ALL ON public.sup_history TO service_role;
ALTER TABLE public.sup_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sup_hist_staff_read" ON public.sup_history
  FOR SELECT TO authenticated USING (public.is_support_staff(auth.uid()));
CREATE POLICY "sup_hist_requester_read" ON public.sup_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sup_tickets t WHERE t.id = sup_history.ticket_id AND t.requester_id = auth.uid())
  );
CREATE POLICY "sup_hist_insert_any" ON public.sup_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Immutability for history, notes, sla_events, feedback
CREATE TRIGGER sup_hist_no_update BEFORE UPDATE OR DELETE ON public.sup_history
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();
CREATE TRIGGER sup_notes_no_update BEFORE UPDATE OR DELETE ON public.sup_notes
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();
CREATE TRIGGER sup_sla_no_update BEFORE UPDATE OR DELETE ON public.sup_sla_events
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();
CREATE TRIGGER sup_fb_no_update BEFORE UPDATE OR DELETE ON public.sup_feedback
  FOR EACH ROW EXECUTE FUNCTION public.ver_block_write();

-- Ticket numbering + SLA defaults + department default
CREATE OR REPLACE FUNCTION public.sup_ticket_before_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dept_id uuid;
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := 'TKT-' || to_char(now(),'YYYY') || '-' ||
      lpad((floor(random()*900000)::int + 100000)::text, 6, '0');
  END IF;
  IF NEW.owning_department_id IS NULL THEN
    SELECT id INTO dept_id FROM public.admin_departments WHERE key = 'support' LIMIT 1;
    NEW.owning_department_id := dept_id;
  END IF;
  IF NEW.first_response_due_at IS NULL THEN
    NEW.first_response_due_at := now() + CASE NEW.priority
      WHEN 'critical' THEN interval '1 hour'
      WHEN 'high'     THEN interval '4 hours'
      WHEN 'medium'   THEN interval '12 hours'
      ELSE                 interval '24 hours' END;
  END IF;
  IF NEW.resolution_due_at IS NULL THEN
    NEW.resolution_due_at := now() + CASE NEW.priority
      WHEN 'critical' THEN interval '4 hours'
      WHEN 'high'     THEN interval '1 day'
      WHEN 'medium'   THEN interval '3 days'
      ELSE                 interval '7 days' END;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sup_ticket_bi BEFORE INSERT ON public.sup_tickets
  FOR EACH ROW EXECUTE FUNCTION public.sup_ticket_before_insert();

CREATE TRIGGER sup_ticket_touch BEFORE UPDATE ON public.sup_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto history on status change / creation
CREATE OR REPLACE FUNCTION public.sup_ticket_hist() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sup_history(ticket_id, event_type, actor_id, details)
    VALUES (NEW.id, 'ticket_created', NEW.requester_id,
      jsonb_build_object('number', NEW.ticket_number, 'priority', NEW.priority, 'category', NEW.category));
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.sup_history(ticket_id, event_type, actor_id, details)
      VALUES (NEW.id, 'status_changed', auth.uid(),
        jsonb_build_object('from', OLD.status, 'to', NEW.status));
      IF NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at := now();
      END IF;
      IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN
        NEW.closed_at := now();
      END IF;
      IF NEW.status = 'reopened' THEN
        NEW.reopened_at := now();
      END IF;
    END IF;
    IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
      INSERT INTO public.sup_history(ticket_id, event_type, actor_id, details)
      VALUES (NEW.id, 'assignee_changed', auth.uid(),
        jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sup_ticket_hist_ai AFTER INSERT ON public.sup_tickets
  FOR EACH ROW EXECUTE FUNCTION public.sup_ticket_hist();
CREATE TRIGGER sup_ticket_hist_bu BEFORE UPDATE ON public.sup_tickets
  FOR EACH ROW EXECUTE FUNCTION public.sup_ticket_hist();

-- Auto-record first response on staff message
CREATE OR REPLACE FUNCTION public.sup_msg_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.author_role IN ('agent','system') THEN
    UPDATE public.sup_tickets SET
      first_responded_at = COALESCE(first_responded_at, now()),
      status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
    WHERE id = NEW.ticket_id;
  END IF;
  INSERT INTO public.sup_history(ticket_id, event_type, actor_id, details)
  VALUES (NEW.ticket_id, 'message_added', NEW.author_id, jsonb_build_object('role', NEW.author_role));
  RETURN NEW;
END; $$;
CREATE TRIGGER sup_msg_ai AFTER INSERT ON public.sup_messages
  FOR EACH ROW EXECUTE FUNCTION public.sup_msg_after_insert();

-- Seed support department
INSERT INTO public.admin_departments (key, name, description, is_system)
VALUES ('support','Support','Customer support and service operations', true)
ON CONFLICT (key) DO NOTHING;
