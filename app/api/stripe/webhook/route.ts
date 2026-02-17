import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function getEventObject(event: Stripe.Event): unknown {
  const rawEvent = event as unknown as Record<string, unknown>;
  const rawData = rawEvent["data"] as Record<string, unknown> | undefined;
  return rawData?.["object"];
}

async function getSubscription(stripeClient: Stripe, subscriptionId: string): Promise<Stripe.Subscription> {
  const res = await stripeClient.subscriptions.retrieve(subscriptionId);
  return res as unknown as Stripe.Subscription;
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
      const session = getEventObject(event) as Stripe.Checkout.Session;
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
        currentPeriodEnd =
          typeof subscription.current_period_end === "number"
            ? toIsoDate(subscription.current_period_end)
            : null;
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

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = getEventObject(event) as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (!customerId) break;

      const userId =
        subscription.metadata?.user_id ??
        (await resolveUserIdFromCustomer(adminClient, customerId));

      if (!userId) break;

      const status = subscription.status;
      const currentPeriodEnd =
        typeof subscription.current_period_end === "number"
          ? toIsoDate(subscription.current_period_end)
          : null;
      const isPremium = status === "active" || status === "trialing";

      await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        isPremium,
        status,
        currentPeriodEnd,
      });
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = getEventObject(event) as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;

      if (!customerId) break;

      const userId = await resolveUserIdFromCustomer(adminClient, customerId);
      if (!userId) break;

      if (event.type === "invoice.paid") {
        let status = "active";
        let currentPeriodEnd: string | null = null;

        if (subscriptionId) {
          const subscription = await getSubscription(stripe, subscriptionId);
          status = subscription.status;
          currentPeriodEnd =
            typeof subscription.current_period_end === "number"
              ? toIsoDate(subscription.current_period_end)
              : null;
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
      } else {
        await upsertEntitlement({
          adminClient,
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          isPremium: false,
          status: "past_due",
          currentPeriodEnd: null,
        });
      }

      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
