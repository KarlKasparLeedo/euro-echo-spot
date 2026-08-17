CREATE TABLE public.savings_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL CHECK (kind IN ('deposit','withdrawal','goal')),
  amount numeric NOT NULL,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  note text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_movements TO authenticated;
GRANT ALL ON public.savings_movements TO service_role;

ALTER TABLE public.savings_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own savings movements" ON public.savings_movements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX savings_movements_user_date_idx ON public.savings_movements (user_id, date DESC);