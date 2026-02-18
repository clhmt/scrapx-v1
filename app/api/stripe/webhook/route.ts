import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type SubWithPeriodEnd = Stripe.Subscription & { current_period_end?: number | null };
type InvoiceWithSubscription = Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as unknown as InvoiceWithSubscription;
  const sub = inv.subscription;

  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) {
    return (sub as Stripe.Subscription).id;
  }
  return null;
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

function logMappingFailure(message: string, details: Record<string, unknown>) {
  console.error(`[stripe-webhook] ${message}`, details);
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
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      const metadataUserId = session.metadata?.user_id ?? null;
      const clientReferenceUserId = session.client_reference_id ?? null;
      const email = session.customer_details?.email ?? null;

      let userIdSource = "none";
      let userId = metadataUserId;

      if (userId) {
        userIdSource = "metadata";
      } else if (clientReferenceUserId) {
        userId = clientReferenceUserId;
        userIdSource = "client_reference_id";
      }

      if (!userId && customerId) {
        userId = await resolveUserIdFromCustomer(adminClient, customerId);
        if (userId) {
          userIdSource = "stripe_customers";
        }
      }

      if (!userId && email) {
        logMappingFailure("Unable to apply email fallback mapping in current typed schema", {
          eventType: event.type,
          eventId: event.id,
          customerId,
          email,
          attemptedSource: "email_fallback",
        });
      }

      if (!userId) {
        logMappingFailure("Missing userId for checkout.session.completed", {
          eventType: event.type,
          eventId: event.id,
          customerId,
          metadataUserId,
          clientReferenceUserId,
          userIdSource,
        });
        break;
      }

      if (customerId) {
        const { error: stripeCustomerUpsertError } = await adminClient.from("stripe_customers").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
          },
          { onConflict: "user_id" }
        );

        if (stripeCustomerUpsertError) {
          logMappingFailure("Failed to upsert stripe_customers on checkout completion", {
            eventType: event.type,
            eventId: event.id,
            userId,
            customerId,
            userIdSource,
            error: stripeCustomerUpsertError.message,
          });
        }
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

      const { error: entitlementUpsertError } = await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        isPremium: true,
        status,
        currentPeriodEnd,
      });

      if (entitlementUpsertError) {
        logMappingFailure("Failed to upsert entitlement on checkout completion", {
          eventType: event.type,
          eventId: event.id,
          userId,
          customerId,
          subscriptionId,
          userIdSource,
          error: entitlementUpsertError.message,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as unknown as SubWithPeriodEnd;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (!customerId) {
        logMappingFailure("Missing customerId on subscription.updated", {
          eventType: event.type,
          eventId: event.id,
          subscriptionId: subscription.id,
        });
        break;
      }

      const userId =
        subscription.metadata?.user_id ??
        (await resolveUserIdFromCustomer(adminClient, customerId));

      if (!userId) {
        logMappingFailure("Missing userId on subscription.updated", {
          eventType: event.type,
          eventId: event.id,
          customerId,
          subscriptionId: subscription.id,
        });
        break;
      }

      const cpe =
        typeof subscription.current_period_end === "number"
          ? toIsoDate(subscription.current_period_end)
          : null;

      const { error: entitlementUpsertError } = await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        isPremium: subscription.status === "active" || subscription.status === "trialing",
        status: subscription.status,
        currentPeriodEnd: cpe,
      });

      if (entitlementUpsertError) {
        logMappingFailure("Failed to upsert entitlement on subscription.updated", {
          eventType: event.type,
          eventId: event.id,
          userId,
          customerId,
          subscriptionId: subscription.id,
          error: entitlementUpsertError.message,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as SubWithPeriodEnd;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (!customerId) {
        logMappingFailure("Missing customerId on subscription.deleted", {
          eventType: event.type,
          eventId: event.id,
          subscriptionId: subscription.id,
        });
        break;
      }

      const userId =
        subscription.metadata?.user_id ??
        (await resolveUserIdFromCustomer(adminClient, customerId));

      if (!userId) {
        logMappingFailure("Missing userId on subscription.deleted", {
          eventType: event.type,
          eventId: event.id,
          customerId,
          subscriptionId: subscription.id,
        });
        break;
      }

      const { error: entitlementUpsertError } = await upsertEntitlement({
        adminClient,
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        isPremium: false,
        status: "canceled",
        currentPeriodEnd: null,
      });

      if (entitlementUpsertError) {
        logMappingFailure("Failed to upsert entitlement on subscription.deleted", {
          eventType: event.type,
          eventId: event.id,
          userId,
          customerId,
          subscriptionId: subscription.id,
          error: entitlementUpsertError.message,
        });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

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
      const subscriptionId = getInvoiceSubscriptionId(invoice);

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
