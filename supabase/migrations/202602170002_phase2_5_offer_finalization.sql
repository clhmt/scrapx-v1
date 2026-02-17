-- Phase 2.5: Offer finalization constraints and seller-only status updates

ALTER TABLE IF EXISTS public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Offer participants can view offers" ON public.offers;
DROP POLICY IF EXISTS "Offers visible to buyer or seller" ON public.offers;

CREATE POLICY "Offers visible to buyer or seller"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Offer participants can update offers" ON public.offers;
DROP POLICY IF EXISTS "Sellers can finalize pending offers" ON public.offers;

CREATE POLICY "Sellers can finalize pending offers"
  ON public.offers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (
    auth.uid() = seller_id
    AND status IN ('accepted', 'rejected')
  );

CREATE OR REPLACE FUNCTION public.enforce_offer_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted', 'rejected') THEN
      RAISE EXCEPTION 'Offer status transitions are restricted to pending -> accepted/rejected';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_offer_status_transition ON public.offers;
CREATE TRIGGER trg_enforce_offer_status_transition
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_offer_status_transition();

