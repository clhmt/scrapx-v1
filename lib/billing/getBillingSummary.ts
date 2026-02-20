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

export async function getAuthenticatedBillingSummary(): Promise<AuthenticatedBillingSummary | null> {
  const context = await getAuthenticatedBillingContext();

  if (!context) {
    return null;
  }

  let stripeCustomerId = context.stripeCustomerId;

  if (!stripeCustomerId) {
    const resolved = await resolveStripeCustomerForUser({
      userId: context.userId,
      email: context.email,
    });

    if (resolved.stripeCustomerId) {
      const adminClient = createAdminClient();
      const updatePayload: {
        stripe_customer_id: string;
        stripe_subscription_id?: string;
      } = {
        stripe_customer_id: resolved.stripeCustomerId,
      };

      if (!context.stripeSubscriptionId && resolved.stripeSubscriptionId) {
        updatePayload.stripe_subscription_id = resolved.stripeSubscriptionId;
      }

      await adminClient
        .from("user_entitlements")
        .update(updatePayload)
        .eq("user_id", context.userId)
        .is("stripe_customer_id", null);

      stripeCustomerId = resolved.stripeCustomerId;
      console.info("[billing] backfilled stripe_customer_id", { userId: context.userId, matched: true });
    }
  }

  if (!stripeCustomerId) {
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

  const subscription = await getLatestSubscriptionForCustomer(stripeCustomerId);
  const customer = await stripe.customers.retrieve(stripeCustomerId);

  let defaultPaymentMethodId: string | null = null;

  if (subscription?.default_payment_method) {
    defaultPaymentMethodId =
      typeof subscription.default_payment_method === "string"
        ? subscription.default_payment_method
        : subscription.default_payment_method.id;
  }

  if (!defaultPaymentMethodId && !customer.deleted) {
    const customerDefaultPm = customer.invoice_settings.default_payment_method;
    defaultPaymentMethodId = typeof customerDefaultPm === "string" ? customerDefaultPm : customerDefaultPm?.id ?? null;
  }

  const paymentMethod = defaultPaymentMethodId ? await stripe.paymentMethods.retrieve(defaultPaymentMethodId) : null;

  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: 20,
  });

  type InvoiceLike = {
    id?: string;
    status?: unknown;
    amount_paid?: number;
    amount_due?: number;
    currency?: string;
    hosted_invoice_url?: string | null;
    invoice_pdf?: string | null;
    created?: number;
    number?: string | null;
  };

  function hasStringId(inv: InvoiceLike): inv is InvoiceLike & { id: string } {
    return typeof inv.id === "string" && inv.id.length > 0;
  }

  const invoiceSummaries: BillingInvoiceSummary[] = ((invoices?.data ?? []) as InvoiceLike[])
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

  const sub = subscription as unknown as StripeSubscriptionLike;

  return {
    userId: context.userId,
    summary: {
      isPremium: context.isPremium,
      customerId: stripeCustomerId,
      hasSubscription: Boolean(subscription),
      subscription: subscription
        ? {
            id: sub.id,
            status: (sub.status ?? "unknown") as string,
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            current_period_start: sub.current_period_start ?? null,
            current_period_end: sub.current_period_end ?? null,
            created: Number(sub.created ?? 0),
          }
        : null,
      paymentMethod: toPaymentMethodSummary(paymentMethod),
      invoices: invoiceSummaries,
    },
  };
}
