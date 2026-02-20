import "server-only";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingContext, getLatestSubscriptionForCustomer } from "@/app/api/billing/_lib/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveStripeCustomerForUser } from "@/lib/billing/resolveStripeCustomer";
import type { BillingInvoiceSummary, BillingPaymentMethodSummary, BillingSummaryResponse } from "@/types/billing";

type AuthenticatedBillingSummary = {
  userId: string;
  summary: BillingSummaryResponse;
};

type StripeSubscriptionLike = {
  id: string;
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  created?: number | null;
};

type StripeInvoiceLike = {
  id?: string;
  status?: unknown;
  amount_paid?: number;
  amount_due?: number;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  created?: number;
  number?: string | null;
};

type CustomerBillingSnapshot = {
  customerId: string;
  subscription: Stripe.Subscription | null;
  paymentMethod: BillingPaymentMethodSummary | null;
  invoices: BillingInvoiceSummary[];
};

const USABLE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function toPaymentMethodSummary(paymentMethod: Stripe.PaymentMethod | null): BillingPaymentMethodSummary | null {
  if (!paymentMethod || paymentMethod.type !== "card") {
    return null;
  }

  return {
    brand: paymentMethod.card?.brand ?? null,
    last4: paymentMethod.card?.last4 ?? null,
    exp_month: paymentMethod.card?.exp_month ?? null,
    exp_year: paymentMethod.card?.exp_year ?? null,
  };
}

function hasStringId(inv: StripeInvoiceLike): inv is StripeInvoiceLike & { id: string } {
  return typeof inv.id === "string" && inv.id.length > 0;
}

function hasUsableSubscription(subscription: Stripe.Subscription | null): boolean {
  return Boolean(subscription?.status && USABLE_SUBSCRIPTION_STATUSES.has(subscription.status));
}

function redactedUser(userId: string): string {
  return userId.slice(-6);
}

async function loadSnapshotForCustomer(customerId: string): Promise<CustomerBillingSnapshot | null> {
  try {
    const subscription = await getLatestSubscriptionForCustomer(customerId);
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return null;
    }

    let defaultPaymentMethodId: string | null = null;

    if (subscription?.default_payment_method) {
      defaultPaymentMethodId =
        typeof subscription.default_payment_method === "string"
          ? subscription.default_payment_method
          : subscription.default_payment_method.id;
    }

    if (!defaultPaymentMethodId) {
      const customerDefaultPm = customer.invoice_settings.default_payment_method;
      defaultPaymentMethodId = typeof customerDefaultPm === "string" ? customerDefaultPm : customerDefaultPm?.id ?? null;
    }

    const paymentMethod = defaultPaymentMethodId ? await stripe.paymentMethods.retrieve(defaultPaymentMethodId) : null;
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 20 });

    const invoiceSummaries: BillingInvoiceSummary[] = ((invoices?.data ?? []) as StripeInvoiceLike[])
      .filter(hasStringId)
      .map((inv) => ({
        id: inv.id,
        status: (inv.status as string | null | undefined) ?? null,
        amount_paid: inv.amount_paid ?? 0,
        amount_due: inv.amount_due ?? 0,
        created: Number(inv.created ?? 0),
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
        invoice_pdf: inv.invoice_pdf ?? null,
        number: inv.number ?? null,
      }));

    return {
      customerId,
      subscription,
      paymentMethod: toPaymentMethodSummary(paymentMethod),
      invoices: invoiceSummaries,
    };
  } catch {
    return null;
  }
}

async function backfillResolvedCustomer(params: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
}) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("user_entitlements")
    .update({
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      status: params.subscriptionStatus ?? "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (error) {
    console.warn(`[billing] backfill failed (user=${redactedUser(params.userId)})`, error.message);
    return;
  }

  console.info(`[billing] backfilled stripe_customer_id for user=${redactedUser(params.userId)}`);
}

export async function getAuthenticatedBillingSummary(): Promise<AuthenticatedBillingSummary | null> {
  const context = await getAuthenticatedBillingContext();

  if (!context) {
    return null;
  }

  let snapshot: CustomerBillingSnapshot | null = null;
  let shouldForceFallback = false;

  if (context.stripeCustomerId) {
    snapshot = await loadSnapshotForCustomer(context.stripeCustomerId);

    if (!snapshot || !hasUsableSubscription(snapshot.subscription)) {
      shouldForceFallback = true;
      console.info("[billing] stale customer id, forcing email fallback");
    }
  } else {
    shouldForceFallback = true;
  }

  if (shouldForceFallback) {
    const resolved = await resolveStripeCustomerForUser({
      userId: context.userId,
      email: context.email,
    });

    if (resolved.stripeCustomerId) {
      await backfillResolvedCustomer({
        userId: context.userId,
        stripeCustomerId: resolved.stripeCustomerId,
        stripeSubscriptionId: resolved.stripeSubscriptionId,
        subscriptionStatus: resolved.subscriptionStatus,
      });

      snapshot = await loadSnapshotForCustomer(resolved.stripeCustomerId);
    }
  }

  if (!snapshot || !hasUsableSubscription(snapshot.subscription)) {
    return {
      userId: context.userId,
      summary: {
        isPremium: context.isPremium,
        customerId: null,
        hasSubscription: false,
        subscription: null,
        paymentMethod: null,
        invoices: [],
      },
    };
  }

  const sub = snapshot.subscription as unknown as StripeSubscriptionLike;

  return {
    userId: context.userId,
    summary: {
      isPremium: context.isPremium,
      customerId: snapshot.customerId,
      hasSubscription: true,
      subscription: {
        id: sub.id,
        status: (sub.status ?? "unknown") as string,
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
        current_period_start: sub.current_period_start ?? null,
        current_period_end: sub.current_period_end ?? null,
        created: Number(sub.created ?? 0),
      },
      paymentMethod: snapshot.paymentMethod,
      invoices: snapshot.invoices,
    },
  };
}
