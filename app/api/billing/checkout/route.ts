import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePricePremiumMonthly = process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
const publicStripePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function POST(request: NextRequest) {
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey ||
    !stripe ||
    !(stripePricePremiumMonthly || publicStripePriceId) ||
    !siteUrl
  ) {
    return NextResponse.json({ error: "Server is missing billing configuration" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json({ error: "Please verify your email before upgrading." }, { status: 403 });
  }

  let requestedPriceId: string | null = null;

  try {
    const body = await request.json();
    if (body && typeof body.priceId === "string") {
      requestedPriceId = body.priceId;
    }
  } catch {
    requestedPriceId = null;
  }

  const checkoutPriceId = requestedPriceId || stripePricePremiumMonthly || publicStripePriceId;

  if (!checkoutPriceId) {
    return NextResponse.json({ error: "Server is missing billing configuration" }, { status: 500 });
  }

  const { data: existingCustomer, error: customerQueryError } = await adminClient
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (customerQueryError) {
    return NextResponse.json({ error: customerQueryError.message }, { status: 500 });
  }

  let stripeCustomerId = existingCustomer?.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });

    stripeCustomerId = customer.id;

    const { error: customerInsertError } = await adminClient.from("stripe_customers").upsert(
      {
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      },
      { onConflict: "user_id" }
    );

    if (customerInsertError) {
      return NextResponse.json({ error: customerInsertError.message }, { status: 500 });
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: checkoutPriceId, quantity: 1 }],
    success_url: `${siteUrl}/billing/success`,
    cancel_url: `${siteUrl}/billing/cancel`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
