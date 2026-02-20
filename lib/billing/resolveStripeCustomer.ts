import "server-only";
import { stripe } from "@/lib/stripe";

export type ResolvedStripe = {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
};

type CandidateMatch = {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: string;
  subscriptionCreated: number;
  score: number;
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

  const matches: CandidateMatch[] = [];

  for (const customer of customers.data) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    if (!subscriptions.data.length) {
      continue;
    }

    let bestSubscription = subscriptions.data[0];
    let bestScore = STATUS_PRIORITY[bestSubscription.status] ?? 0;

    for (const subscription of subscriptions.data.slice(1)) {
      const score = STATUS_PRIORITY[subscription.status] ?? 0;
      const created = subscription.created ?? 0;
      const bestCreated = bestSubscription.created ?? 0;

      if (score > bestScore || (score === bestScore && created > bestCreated)) {
        bestSubscription = subscription;
        bestScore = score;
      }
    }

    matches.push({
      stripeCustomerId: customer.id,
      stripeSubscriptionId: bestSubscription.id,
      subscriptionStatus: bestSubscription.status,
      subscriptionCreated: bestSubscription.created ?? 0,
      score: bestScore,
    });
  }

  if (!matches.length) {
    return emptyResolution();
  }

  const sortedMatches = [...matches].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (b.subscriptionCreated !== a.subscriptionCreated) {
      return b.subscriptionCreated - a.subscriptionCreated;
    }

    return 0;
  });

  if (sortedMatches.length > 1) {
    const [first, second] = sortedMatches;
    const ambiguous =
      first.score === second.score && first.subscriptionCreated === second.subscriptionCreated;

    if (ambiguous) {
      console.warn("[billing] stripe email lookup ambiguous", { userId: params.userId });
      return emptyResolution();
    }
  }

  const winner = sortedMatches[0];

  return {
    stripeCustomerId: winner.stripeCustomerId,
    stripeSubscriptionId: winner.stripeSubscriptionId,
    subscriptionStatus: winner.subscriptionStatus,
  };
}
