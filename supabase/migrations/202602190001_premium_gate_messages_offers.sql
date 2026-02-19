-- Premium enforcement for messaging and offers inserts.

CREATE OR REPLACE FUNCTION public.is_premium(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_entitlements ue
    WHERE ue.user_id = uid
      AND ue.is_premium = true
  );
$$;

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert messages." ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Premium users can insert messages" ON public.messages;

CREATE POLICY "Premium users can insert messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_premium(auth.uid())
  );

DROP POLICY IF EXISTS "Buyers can create offers" ON public.offers;
DROP POLICY IF EXISTS "Premium buyers can create offers" ON public.offers;

CREATE POLICY "Premium buyers can create offers"
  ON public.offers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND public.is_premium(auth.uid())
  );

DROP POLICY IF EXISTS "Participants can insert conversations." ON public.conversations;
DROP POLICY IF EXISTS "Premium users can insert conversations" ON public.conversations;

CREATE POLICY "Premium users can insert conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = buyer_id OR auth.uid() = seller_id)
    AND public.is_premium(auth.uid())
  );
