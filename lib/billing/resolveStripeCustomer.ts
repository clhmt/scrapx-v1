import "server-only";
import { stripe } from "@/lib/stripe";

export type ResolvedStripe = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
};

type StripeSubscriptionLike = {
  id: string;
  status: string;
  created?: number | null;
  cancel_at_period_end?: boolean | null;
  customer: string | { id: string };
};

const STATUS_PRIORITY: Record<string, number> = {
  active: 5,
  trialing: 4,
  past_due: 3,
  unpaid: 2,
  canceled: 1,
};

function emptyResolution(): ResolvedStripe {
  return {
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
  };
}

function getCustomerId(subscription: StripeSubscriptionLike): string | null {
  if (typeof subscription.customer === "string") {
    return subscription.customer;
  }

  if (subscription.customer && typeof subscription.customer === "object") {
    return subscription.customer.id;
  }

  return null;
}

function compareSubscriptions(a: StripeSubscriptionLike, b: StripeSubscriptionLike): number {
  const scoreA = STATUS_PRIORITY[a.status] ?? 0;
  const scoreB = STATUS_PRIORITY[b.status] ?? 0;

  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  const createdA = a.created ?? 0;
  const createdB = b.created ?? 0;

  if (createdA !== createdB) {
    return createdB - createdA;
  }

  const aNotCanceling = a.cancel_at_period_end === false;
  const bNotCanceling = b.cancel_at_period_end === false;

  if (aNotCanceling !== bNotCanceling) {
    return bNotCanceling ? 1 : -1;
  }

  return 0;
}

export async function resolveStripeCustomerForUser(params: {
  userId: string;
  email: string | null;
}): Promise<ResolvedStripe> {
  const trimmedEmail = params.email?.trim();

  if (!trimmedEmail) {
    return emptyResolution();
  }

  const customers = await stripe.customers.list({
    email: trimmedEmail,
    limit: 10,
  });

  const allSubscriptions: StripeSubscriptionLike[] = [];

  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    allSubscriptions.push(...(subscriptions.data as unknown as StripeSubscriptionLike[]));
  }

  if (!allSubscriptions.length) {
    return emptyResolution();
  }

  if (customers.data.length > 1) {
    console.info("[billing] stripe email lookup picked best subscription", {
      userId: params.userId,
      customerCount: customers.data.length,
      subscriptionCount: allSubscriptions.length,
    });
  }

  const [bestSubscription] = [...allSubscriptions].sort(compareSubscriptions);
  const stripeCustomerId = getCustomerId(bestSubscription);

  if (!stripeCustomerId) {
    return emptyResolution();
  }

  return {
    stripeCustomerId,
    stripeSubscriptionId: bestSubscription.id,
    subscriptionStatus: bestSubscription.status,
  };
}