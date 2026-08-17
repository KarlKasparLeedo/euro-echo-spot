REVOKE ALL ON FUNCTION public.current_household_id() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_household_member(uuid) FROM public, anon, authenticated;