import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const publicStripePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function getBaseSiteUrl() {
  const nextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const siteUrl = process.env.SITE_URL;
  const vercelUrl = process.env.VERCEL_URL;

  if (nextPublicSiteUrl) return nextPublicSiteUrl;
  if (siteUrl) return siteUrl;
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { priceId } = await request.json().catch(() => ({} as { priceId?: string }));

  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
  }

  const effectivePriceId = priceId || stripePriceId || publicStripePriceId;

  if (!effectivePriceId) {
    return NextResponse.json(
      { error: "Missing priceId (payload.priceId, STRIPE_PRICE_ID, NEXT_PUBLIC_STRIPE_PRICE_ID)" },
      { status: 500 }
    );
  }

  const baseSiteUrl = getBaseSiteUrl();

  if (!baseSiteUrl) {
    return NextResponse.json(
      { error: "Missing site URL (NEXT_PUBLIC_SITE_URL/SITE_URL/VERCEL_URL) for success/cancel URLs" },
      { status: 500 }
    );
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !stripe) {
    return NextResponse.json(
      { error: "Missing Supabase billing dependencies (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 }
    );
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
    line_items: [{ price: effectivePriceId, quantity: 1 }],
    success_url: `${baseSiteUrl}/billing/success`,
    cancel_url: `${baseSiteUrl}/billing/cancel`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  const checkoutCustomerId = typeof checkoutSession.customer === "string" ? checkoutSession.customer : null;

  if (checkoutCustomerId) {
    const { error: customerUpsertError } = await adminClient.from("stripe_customers").upsert(
      {
        user_id: user.id,
        stripe_customer_id: checkoutCustomerId,
      },
      { onConflict: "user_id" }
    );

    if (customerUpsertError) {
      return NextResponse.json({ error: customerUpsertError.message }, { status: 500 });
    }
  }

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
