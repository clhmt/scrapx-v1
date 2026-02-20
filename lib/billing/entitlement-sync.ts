import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import type { Database } from "@/lib/supabase/database.types";

type SubWithPeriodEnd = Stripe.Subscription & { current_period_end?: number | null };

type EntitlementPayload = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  isPremium: boolean;
  currentPeriodEnd: string | null;
};

export function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

export function isPremiumStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}

export async function getSubscription(
  stripeClient: Stripe,
  subscriptionId: string
): Promise<SubWithPeriodEnd> {
  const res = await stripeClient.subscriptions.retrieve(subscriptionId);
  return res as SubWithPeriodEnd;
}

export async function upsertEntitlement(
  adminClient: SupabaseClient<Database>,
  payload: EntitlementPayload
) {
  return adminClient.from("user_entitlements").upsert(
    {
      user_id: payload.userId,
      is_premium: payload.isPremium,
      status: payload.status,
      premium_until: payload.currentPeriodEnd,
      current_period_end: payload.currentPeriodEnd,
      stripe_customer_id: payload.stripeCustomerId,
      stripe_subscription_id: payload.stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function upsertStripeCustomerLink(
  adminClient: SupabaseClient<Database>,
  userId: string,
  stripeCustomerId: string
) {
  return adminClient.from("stripe_customers").upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
    },
    { onConflict: "user_id" }
  );
}
