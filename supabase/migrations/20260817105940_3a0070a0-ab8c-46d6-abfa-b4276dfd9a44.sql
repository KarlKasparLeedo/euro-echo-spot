CREATE OR REPLACE FUNCTION public.join_household_by_code(_code text)
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _h record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF EXISTS (SELECT 1 FROM public.household_members m WHERE m.user_id = _uid) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  SELECT h.id, h.name INTO _h
  FROM public.households h
  WHERE upper(h.invite_code) = upper(btrim(_code))
  LIMIT 1;

  IF _h IS NULL THEN
    RAISE EXCEPTION 'CODE_NOT_FOUND';
  END IF;

  INSERT INTO public.household_members (household_id, user_id) VALUES (_h.id, _uid);

  id := _h.id;
  name := _h.name;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.join_household_by_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_household_by_code(text) TO authenticated;