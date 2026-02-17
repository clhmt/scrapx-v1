-- Phase 2: Structured B2B offers

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tonnage numeric NOT NULL CHECK (tonnage > 0),
  price_per_ton numeric NOT NULL CHECK (price_per_ton > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offers_listing_id_idx ON public.offers (listing_id);
CREATE INDEX IF NOT EXISTS offers_buyer_id_idx ON public.offers (buyer_id);
CREATE INDEX IF NOT EXISTS offers_seller_id_idx ON public.offers (seller_id);
CREATE INDEX IF NOT EXISTS offers_created_at_idx ON public.offers (created_at);

CREATE OR REPLACE FUNCTION public.set_offer_seller_from_listing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_seller_id uuid;
BEGIN
  SELECT l.user_id
  INTO resolved_seller_id
  FROM public.listings l
  WHERE l.id = NEW.listing_id;

  IF resolved_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found for offer creation';
  END IF;

  NEW.seller_id := resolved_seller_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_offer_seller_from_listing ON public.offers;
CREATE TRIGGER trg_set_offer_seller_from_listing
BEFORE INSERT ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.set_offer_seller_from_listing();

ALTER TABLE IF EXISTS public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Offer participants can view offers" ON public.offers;
DROP POLICY IF EXISTS "Buyers can create offers" ON public.offers;
DROP POLICY IF EXISTS "Offer participants can update offers" ON public.offers;
DROP POLICY IF EXISTS "Offer participants can delete offers" ON public.offers;

CREATE POLICY "Offer participants can view offers"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create offers"
  ON public.offers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Offer participants can update offers"
  ON public.offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Offer participants can delete offers"
  ON public.offers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

ALTER TABLE IF EXISTS public.messages
  ADD COLUMN IF NOT EXISTS offer_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_offer_id_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_offer_id_fkey
      FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS messages_offer_id_idx ON public.messages (offer_id);
