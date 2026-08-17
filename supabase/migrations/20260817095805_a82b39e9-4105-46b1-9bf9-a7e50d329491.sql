CREATE TABLE public.month_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  month date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.month_closures TO authenticated;
GRANT ALL ON public.month_closures TO service_role;

ALTER TABLE public.month_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own month closures" ON public.month_closures
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);