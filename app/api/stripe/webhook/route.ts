import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  getSubscription,
  isPremiumStatus,
  toIsoDate,
  upsertEntitlement,
  upsertStripeCustomerLink,
} from "@/lib/billing/entitlement-sync";

type InvoiceWithSubscription = Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as InvoiceWithSubscription;
  const sub = inv.subscription;

  if (typeof sub === "string") return sub;
  if (sub && typeof sub === "object" && "id" in sub) {
    return (sub as Stripe.Subscription).id;
  }
  return null;
}

async function resolveUserIdFromCustomer(adminClient: SupabaseClient<Database>, customerId: string) {
  const { data } = await adminClient
    .from("stripe_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

function logMappedUser(source: string) {
  console.info("[webhook] mapped user", { source });
}

function logNoMapping(reason: string) {
  console.info("[webhook] no mapping", { reason });
}

function logWebhookError(message: string) {
  console.error("[webhook] error", { message });
}

function mapUserIdFromCheckoutSession(
  session: Stripe.Checkout.Session
): { userId: string | null; source: string } {
  const metadataUserId = session.metadata?.user_id ?? null;
  if (metadataUserId) {
    return { userId: metadataUserId, source: "metadata" };
  }

  if (session.client_reference_id) {
    return { userId: session.client_reference_id, source: "client_reference_id" };
  }

  return { userId: null, source: "none" };
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

  const adminClient = getSupabaseAdminClient();

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
      const mapped = mapUserIdFromCheckoutSession(session);

      if (!mapped.userId) {
        console.log("[webhook] no user mapping found");
        break;
      }

      logMappedUser(mapped.source);

      if (customerId) {
        const { error } = await upsertStripeCustomerLink(adminClient, mapped.userId, customerId);
        if (error) {
          logWebhookError("checkout stripe_customers upsert failed");
        }
      }

      let status = "active";
      let currentPeriodEnd: string | null = null;

      if (subscriptionId) {
        const subscription = await getSubscription(stripe, subscriptionId);
        status = subscription.status;
        currentPeriodEnd =
          typeof subscription.current_period_end === "number" ? toIsoDate(subscription.current_period_end) : null;
      }

      const { error } = await upsertEntitlement(adminClient, {
        userId: mapped.userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status,
        isPremium: isPremiumStatus(status),
        currentPeriodEnd,
      });

      if (error) {
        logWebhookError("checkout entitlement upsert failed");
      }

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as unknown as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (!customerId) {
        logNoMapping("subscription-no-customer");
        break;
      }

      const userId = subscription.metadata?.user_id ?? (await resolveUserIdFromCustomer(adminClient, customerId));
      if (!userId) {
        logNoMapping("subscription-no-user");
        break;
      }

      logMappedUser(subscription.metadata?.user_id ? "metadata" : "stripe_customers");

      const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
      const currentPeriodEnd =
        typeof subscription.current_period_end === "number" ? toIsoDate(subscription.current_period_end) : null;

      const { error } = await upsertEntitlement(adminClient, {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status,
        isPremium: isPremiumStatus(status),
        currentPeriodEnd: event.type === "customer.subscription.deleted" ? null : currentPeriodEnd,
      });

      if (error) {
        logWebhookError("subscription entitlement upsert failed");
      }

      break;
    }

    case "invoice.payment_succeeded":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      const subscriptionId = getInvoiceSubscriptionId(invoice);

      if (!customerId) {
        logNoMapping("invoice-no-customer");
        break;
      }

      const userId = await resolveUserIdFromCustomer(adminClient, customerId);
      if (!userId) {
        logNoMapping("invoice-no-user");
        break;
      }

      let status = event.type === "invoice.payment_succeeded" ? "active" : "past_due";
      let currentPeriodEnd: string | null = null;

      if (subscriptionId) {
        const subscription = await getSubscription(stripe, subscriptionId);
        status = subscription.status;
        currentPeriodEnd =
          typeof subscription.current_period_end === "number" ? toIsoDate(subscription.current_period_end) : null;
      }

      const { error } = await upsertEntitlement(adminClient, {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status,
        isPremium: event.type === "invoice.payment_succeeded" ? isPremiumStatus(status) : false,
        currentPeriodEnd: event.type === "invoice.payment_failed" ? null : currentPeriodEnd,
      });

      if (error) {
        logWebhookError("invoice entitlement upsert failed");
      }

      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
