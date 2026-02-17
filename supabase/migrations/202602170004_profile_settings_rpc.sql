-- Phase 3.1: Atomic self-profile update RPC for dashboard Profile Settings tab

-- Ensure conflict target exists for idempotent upsert
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique_idx
  ON public.profiles (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS profile_private_user_id_unique_idx
  ON public.profile_private (user_id);

-- Ensure RLS is enabled (safe no-op when already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- Add owner INSERT/UPDATE policies only when missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles owner insert'
  ) THEN
    CREATE POLICY "Profiles owner insert"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Profiles owner update'
  ) THEN
    CREATE POLICY "Profiles owner update"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_private'
      AND policyname = 'Private profile owner insert'
  ) THEN
    CREATE POLICY "Private profile owner insert"
      ON public.profile_private
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_private'
      AND policyname = 'Private profile owner update'
  ) THEN
    CREATE POLICY "Private profile owner update"
      ON public.profile_private
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.update_my_profile(
  first_name text,
  last_name text,
  company_name text,
  phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller uuid;
BEGIN
  caller := auth.uid();

  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.profiles (user_id, first_name, last_name, company_name)
  VALUES (caller, first_name, last_name, company_name)
  ON CONFLICT (user_id)
  DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    company_name = EXCLUDED.company_name;

  INSERT INTO public.profile_private (user_id, phone, updated_at)
  VALUES (caller, phone, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    phone = EXCLUDED.phone,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_profile(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text, text) TO authenticated;
