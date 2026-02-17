import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type SubWithPeriodEnd = Stripe.Subscription & { current_period_end?: number | null };

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

async function getSubscription(stripeClient: Stripe, subscriptionId: string): Promise<SubWithPeriodEnd> {
  const res = await stripeClient.subscriptions.retrieve(subscriptionId);
  return res as unknown as SubWithPeriodEnd;
}

async function upsertEntitlement({
  adminClient,
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  isPremium,
  status,
  currentPeriodEnd,
}: {
  adminClient: SupabaseClient<Database>;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  isPremium: boolean;
  status: string;
  currentPeriodEnd: string | null;
}) {
  return adminClient.from("user_entitlements").upsert(
    {
      user_id: userId,
      is_premium: isPremium,
      status,
      premium_until: currentPeriodEnd,
      current_period_end: currentPeriodEnd,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

async function resolveUserIdFromCustomer(adminClient: SupabaseClient<Database>, customerId: string) {
  const { data } = await adminClient
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

export async function POST(request: NextRequest) {
  if (!stripe || !stripeWebhookSecret) {
    return NextResponse.json({ error: "Server is missing Stripe webhook configuration" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { error: idempotencyError } = await adminClient.from("stripe_events").insert({
    id: event.id,
    type: event.type,
  });

  if (idempotencyError) {
    if (idempotencyError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    return NextResponse.json({ error: idempotencyError.message }, { status: 500 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;

      if (!userId) break;

      if (customerId) {
        await adminClient.from("stripe_customers").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
          },
          { onConflict: "user_id" }
        );
      }

      let status = "active";
      let currentPeriodEnd: string | null = null;

      if (subscriptionId) {
        const subscription = await getSubscription(stripe, subscriptionId);
        status = subscription.status;
        const cpe =
          typeof subscription.current_period_end === "number"
            ? toIsoDate(subscription.current_period_end)
            : null;
        currentPeriodEnd = cpe;
      }

      await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        isPremium: true,
        status,
        currentPeriodEnd,
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as unknown as SubWithPeriodEnd;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (!customerId) break;

      const userId =
        subscription.metadata?.user_id ??
        (await resolveUserIdFromCustomer(adminClient, customerId));

      if (!userId) break;

      const cpe =
        typeof subscription.current_period_end === "number"
          ? toIsoDate(subscription.current_period_end)
          : null;

      await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        isPremium: subscription.status === "active" || subscription.status === "trialing",
        status: subscription.status,
        currentPeriodEnd: cpe,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as SubWithPeriodEnd;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (!customerId) break;

      const userId =
        subscription.metadata?.user_id ??
        (await resolveUserIdFromCustomer(adminClient, customerId));

      if (!userId) break;

      await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        isPremium: false,
        status: "canceled",
        currentPeriodEnd: null,
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;

      if (!customerId) break;

      const userId = await resolveUserIdFromCustomer(adminClient, customerId);
      if (!userId) break;

      let status = "active";
      let currentPeriodEnd: string | null = null;

      if (subscriptionId) {
        const subscription = await getSubscription(stripe, subscriptionId);
        status = subscription.status;
        const cpe =
          typeof subscription.current_period_end === "number"
            ? toIsoDate(subscription.current_period_end)
            : null;
        currentPeriodEnd = cpe;
      }

      await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        isPremium: true,
        status,
        currentPeriodEnd,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;

      if (!customerId) break;

      const userId = await resolveUserIdFromCustomer(adminClient, customerId);
      if (!userId) break;

      await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        isPremium: false,
        status: "past_due",
        currentPeriodEnd: null,
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
