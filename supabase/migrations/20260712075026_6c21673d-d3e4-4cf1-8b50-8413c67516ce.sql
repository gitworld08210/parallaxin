
CREATE OR REPLACE FUNCTION public.gen_sec_id(_prefix text)
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE seq_num int;
BEGIN
  seq_num := (floor(random() * 900000) + 100000)::int;
  RETURN _prefix || '-' || to_char(now(), 'YYYY') || '-' || seq_num::text;
END; $$;
