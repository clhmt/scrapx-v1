-- Phase 1 security + storage hardening

-- Ensure RLS is enabled on key tables
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;

-- Recreate listings policies to guarantee owner-bound mutations
DROP POLICY IF EXISTS "Listings are viewable by everyone." ON public.listings;
DROP POLICY IF EXISTS "Users can insert their own listings." ON public.listings;
DROP POLICY IF EXISTS "Users can update own listings." ON public.listings;
DROP POLICY IF EXISTS "Users can delete own listings." ON public.listings;

CREATE POLICY "Listings are viewable by everyone."
  ON public.listings
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own listings."
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings."
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings."
  ON public.listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add explicit update/delete safeguards for messages without changing read/write behavior
DROP POLICY IF EXISTS "Users can update own messages." ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages." ON public.messages;

CREATE POLICY "Users can update own messages."
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages."
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Conversation policies (applied only when table exists)
DO $$
BEGIN
  IF to_regclass('public.conversations') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Participants can view conversations." ON public.conversations';
  EXECUTE 'DROP POLICY IF EXISTS "Participants can insert conversations." ON public.conversations';
  EXECUTE 'DROP POLICY IF EXISTS "Participants can update conversations." ON public.conversations';
  EXECUTE 'DROP POLICY IF EXISTS "Participants can delete conversations." ON public.conversations';

  EXECUTE 'CREATE POLICY "Participants can view conversations." ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id)';
  EXECUTE 'CREATE POLICY "Participants can insert conversations." ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id)';
  EXECUTE 'CREATE POLICY "Participants can update conversations." ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id) WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id)';
  EXECUTE 'CREATE POLICY "Participants can delete conversations." ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id)';
END $$;

-- Storage hardening for listings bucket
-- Public read is intentional for marketplace listing photos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'listings'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('listings', 'listings', true);
  END IF;
END $$;

-- Clean previous policies if they exist
DROP POLICY IF EXISTS "Listing images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update listing images in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete listing images in own folder" ON storage.objects;

CREATE POLICY "Listing images are publicly readable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listings');

CREATE POLICY "Authenticated users can upload listing images to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update listing images in own folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete listing images in own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listings'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
