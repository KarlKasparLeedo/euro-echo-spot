CREATE TABLE public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Meie pere',
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_household_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_household_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members m
    WHERE m.user_id = _user_id
      AND m.household_id = public.current_household_id()
      AND public.current_household_id() IS NOT NULL
  )
$$;

CREATE POLICY "members read own household" ON public.households FOR SELECT TO authenticated
  USING (id = public.current_household_id() OR created_by = auth.uid());
CREATE POLICY "create household" ON public.households FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator updates household" ON public.households FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator deletes household" ON public.households FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "read household members" ON public.household_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR household_id = public.current_household_id());
CREATE POLICY "join household" ON public.household_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave household" ON public.household_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.budgets ADD COLUMN shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.goals ADD COLUMN shared boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN display_name text;

CREATE POLICY "family reads shared budgets" ON public.budgets FOR SELECT TO authenticated
  USING (shared = true AND public.is_household_member(user_id));

CREATE POLICY "family reads shared goals" ON public.goals FOR SELECT TO authenticated
  USING (shared = true AND public.is_household_member(user_id));

CREATE POLICY "family reads shared profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_household_member(id));

CREATE POLICY "family reads shared category expenses" ON public.transactions FOR SELECT TO authenticated
  USING (
    type = 'expense'
    AND public.is_household_member(user_id)
    AND category IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.shared = true
        AND b.category = transactions.category
        AND public.is_household_member(b.user_id)
    )
  );

CREATE POLICY "family reads shared goal allocations" ON public.goal_allocations FOR SELECT TO authenticated
  USING (
    public.is_household_member(user_id)
    AND EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_allocations.goal_id AND g.shared = true
    )
  );