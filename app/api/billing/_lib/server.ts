import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

type BillingContext = {
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  isPremium: boolean;
};

export async function getAuthenticatedBillingContext(): Promise<BillingContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("stripe_customer_id, stripe_subscription_id, is_premium")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<{ stripe_customer_id: string | null; stripe_subscription_id: string | null; is_premium: boolean }>();

  if (error) {
    throw error;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    stripeCustomerId: data?.stripe_customer_id ?? null,
    stripeSubscriptionId: data?.stripe_subscription_id ?? null,
    isPremium: Boolean(data?.is_premium),
  };
}

export async function getLatestSubscriptionForCustomer(customerId: string): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  if (!subscriptions.data.length) {
    return null;
  }

  const preferred = subscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
  );

  return preferred ?? subscriptions.data[0] ?? null;
}
