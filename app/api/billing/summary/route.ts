import Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingContext, getLatestSubscriptionForCustomer } from "@/app/api/billing/_lib/server";
import type { BillingInvoiceSummary, BillingPaymentMethodSummary, BillingSummaryResponse } from "@/types/billing";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const context = await getAuthenticatedBillingContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    if (!context.stripeCustomerId) {
      const emptyPayload: BillingSummaryResponse = {
        isPremium: context.isPremium,
        customerId: null,
        subscription: null,
        paymentMethod: null,
        invoices: [],
      };

      return NextResponse.json(emptyPayload, { headers: { "Cache-Control": "no-store" } });
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

    const paymentMethod = defaultPaymentMethodId
      ? await stripe.paymentMethods.retrieve(defaultPaymentMethodId)
      : null;

    const invoices = await stripe.invoices.list({
      customer: context.stripeCustomerId,
      limit: 20,
    });

    const sub = subscription as unknown as StripeSubscriptionLike;

    type InvoiceLike = {
      id?: string;
      status?: any;
      amount_paid?: number;
      amount_due?: number;
      currency?: string;
      hosted_invoice_url?: string | null;
      invoice_pdf?: string | null;
      created?: number;
      period_start?: number;
      period_end?: number;
      number?: string | null;
    };

    function hasStringId(inv: InvoiceLike): inv is InvoiceLike & { id: string } {
      return typeof inv.id === "string" && inv.id.length > 0;
    }

    const invoiceSummaries: BillingInvoiceSummary[] = ((invoices?.data ?? []) as InvoiceLike[])
      .filter(hasStringId)
      .map((inv) => {
        return {
          id: inv.id,
          status: (inv.status ?? null) as any,
          amount_paid: inv.amount_paid ?? 0,
          amount_due: inv.amount_due ?? 0,
          currency: inv.currency ?? "usd",
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
          created: Number(inv.created ?? 0),
          period_start: Number(inv.period_start ?? 0),
          period_end: Number(inv.period_end ?? 0),
          number: inv.number ?? null,
        } as BillingInvoiceSummary;
      });

    const payload: BillingSummaryResponse = {
      isPremium: context.isPremium,
      customerId: context.stripeCustomerId,
      subscription: subscription
        ? {
            id: sub.id,
            status: sub.status as string,
            cancel_at_period_end: Boolean(sub.cancel_at_period_end),
            current_period_start: sub.current_period_start ?? null,
            current_period_end: sub.current_period_end ?? null,
            created: sub.created as number,
          }
        : null,
      paymentMethod: toPaymentMethodSummary(paymentMethod),
      invoices: invoiceSummaries,
    };

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[billing/summary] failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load billing summary" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
