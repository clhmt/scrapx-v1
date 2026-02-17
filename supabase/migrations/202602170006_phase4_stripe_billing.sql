-- Phase 4: Stripe billing + webhook idempotency

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Keep Stripe internals private from normal clients.
DROP POLICY IF EXISTS "Stripe customers owner read" ON public.stripe_customers;
DROP POLICY IF EXISTS "Stripe customers service write" ON public.stripe_customers;
DROP POLICY IF EXISTS "Stripe events service write" ON public.stripe_events;

CREATE POLICY "Stripe customers owner read"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Stripe customers service write"
  ON public.stripe_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Stripe events service write"
  ON public.stripe_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.user_entitlements
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

DROP POLICY IF EXISTS "Entitlements service insert only" ON public.user_entitlements;

CREATE POLICY "Entitlements service insert only"
  ON public.user_entitlements
  FOR INSERT
  TO service_role
  WITH CHECK (true);
