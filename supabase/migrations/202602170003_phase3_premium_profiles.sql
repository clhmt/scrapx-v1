-- Phase 3: Premium entitlements + public seller profile + premium-gated contact/insights

-- Ensure profiles table exists (legacy repos may already have it with different shape)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  company_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backward-compatible columns for existing schema
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- If legacy profiles.id exists, mirror into user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'id'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET user_id = id WHERE user_id IS NULL';
  END IF;
END
$$;

-- Keep user_id unique even if legacy PK is on id
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles (user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium boolean NOT NULL DEFAULT false,
  premium_until timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.is_premium(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT ue.is_premium
        AND (ue.premium_until IS NULL OR ue.premium_until > now())
      FROM public.user_entitlements ue
      WHERE ue.user_id = uid
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.get_listing_offer_count_if_premium(target_listing_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid;
  total_offers integer;
BEGIN
  caller := auth.uid();

  IF caller IS NULL OR NOT public.is_premium(caller) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::integer
  INTO total_offers
  FROM public.offers o
  WHERE o.listing_id = target_listing_id;

  RETURN COALESCE(total_offers, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_listing_offer_count_if_premium(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_listing_offer_count_if_premium(uuid) TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON public.profiles;
DROP POLICY IF EXISTS "Profiles owner insert" ON public.profiles;
DROP POLICY IF EXISTS "Profiles owner update" ON public.profiles;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Profiles owner insert"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Profiles owner update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_entitlements
DROP POLICY IF EXISTS "Entitlements owner read" ON public.user_entitlements;
DROP POLICY IF EXISTS "Entitlements service update only" ON public.user_entitlements;

CREATE POLICY "Entitlements owner read"
  ON public.user_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Entitlements service update only"
  ON public.user_entitlements
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- profile_private
DROP POLICY IF EXISTS "Private profile owner or premium read" ON public.profile_private;
DROP POLICY IF EXISTS "Private profile owner insert" ON public.profile_private;
DROP POLICY IF EXISTS "Private profile owner update" ON public.profile_private;

CREATE POLICY "Private profile owner or premium read"
  ON public.profile_private
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_premium(auth.uid()));

CREATE POLICY "Private profile owner insert"
  ON public.profile_private
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Private profile owner update"
  ON public.profile_private
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
