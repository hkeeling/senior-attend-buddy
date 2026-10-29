ALTER TABLE public.check_ins ADD COLUMN is_late boolean NOT NULL DEFAULT false;

UPDATE public.check_ins c SET is_late = c.checked_in_at > s.opened_at + interval '15 minutes'
FROM public.sessions s WHERE s.id = c.session_id;

CREATE OR REPLACE FUNCTION public.mark_check_in_late()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT NEW.checked_in_at > s.opened_at + interval '15 minutes' INTO NEW.is_late
  FROM public.sessions s WHERE s.id = NEW.session_id;
  NEW.is_late := coalesce(NEW.is_late, false);
  RETURN NEW;
END $$;

-- Named "zz" so it fires after check_ins_guard sets the timestamp.
CREATE TRIGGER check_ins_zz_mark_late BEFORE INSERT ON public.check_ins
FOR EACH ROW EXECUTE FUNCTION public.mark_check_in_late();