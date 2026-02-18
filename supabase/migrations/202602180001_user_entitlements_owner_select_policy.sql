-- Ensure authenticated users can read only their own entitlement row.
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_entitlements'
      AND policyname = 'Users can read own entitlements'
  ) THEN
    CREATE POLICY "Users can read own entitlements"
      ON public.user_entitlements
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
