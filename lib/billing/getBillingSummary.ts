import "server-only";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingContext, getLatestSubscriptionForCustomer } from "@/app/api/billing/_lib/server";
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

  if (!context.stripeCustomerId) {
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

  const subscription = await getLatestSubscriptionForCustomer(context.stripeCustomerId);
  const customer = await stripe.customers.retrieve(context.stripeCustomerId);

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
    customer: context.stripeCustomerId,
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
      customerId: context.stripeCustomerId,
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
