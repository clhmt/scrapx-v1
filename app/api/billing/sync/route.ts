import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSubscription,
  isPremiumStatus,
  toIsoDate,
  upsertEntitlement,
  upsertStripeCustomerLink,
} from "@/lib/billing/entitlement-sync";

export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function GET(request: NextRequest) {
  noStore();

  if (!stripe) {
    return NextResponse.json({ error: "Missing Stripe configuration" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.metadata?.user_id !== user.id) {
    console.info("[sync] ownership mismatch", { reason: "metadata-user-mismatch" });
    return NextResponse.json({ error: "Session does not belong to user" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && typeof session.customer === "object"
      ? session.customer.id
      : null;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription && typeof session.subscription === "object"
      ? session.subscription.id
      : null;

  let status = "active";
  let currentPeriodEnd: string | null = null;

  if (subscriptionId) {
    const subscription = await getSubscription(stripe, subscriptionId);
    status = subscription.status;
    currentPeriodEnd =
      typeof subscription.current_period_end === "number" ? toIsoDate(subscription.current_period_end) : null;
  }

  const adminClient = getSupabaseAdminClient();

  if (customerId) {
    await upsertStripeCustomerLink(adminClient, user.id, customerId);
  }

  const { error } = await upsertEntitlement(adminClient, {
    userId: user.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    status,
    isPremium: isPremiumStatus(status),
    currentPeriodEnd,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to sync billing" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
