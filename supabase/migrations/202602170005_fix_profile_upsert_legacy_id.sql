-- Hotfix: ensure profile settings RPC supports legacy profiles.id NOT NULL schemas
-- and keep user_id as a safe upsert conflict target.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = 'public.profiles'::regclass
        AND c.contype = 'u'
        AND c.conname = 'profiles_user_id_unique'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    END IF;
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
  has_profiles_id boolean;
BEGIN
  caller := auth.uid();

  IF caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'id'
  )
  INTO has_profiles_id;

  IF has_profiles_id THEN
    EXECUTE $sql$
      INSERT INTO public.profiles (id, user_id, first_name, last_name, company_name)
      VALUES ($1, $1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET
        id = EXCLUDED.id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        company_name = EXCLUDED.company_name
    $sql$
    USING caller, first_name, last_name, company_name;
  ELSE
    INSERT INTO public.profiles (user_id, first_name, last_name, company_name)
    VALUES (caller, first_name, last_name, company_name)
    ON CONFLICT (user_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      company_name = EXCLUDED.company_name;
  END IF;

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
