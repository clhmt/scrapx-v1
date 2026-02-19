import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingContext, getLatestSubscriptionForCustomer } from "@/app/api/billing/_lib/server";

export const dynamic = "force-dynamic";

type AttachPaymentMethodBody = {
  paymentMethodId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthenticatedBillingContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    if (!context.stripeCustomerId) {
      return NextResponse.json({ error: "No billing customer found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const body = (await request.json().catch(() => null)) as AttachPaymentMethodBody | null;
    const paymentMethodId = body?.paymentMethodId?.trim();

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: context.stripeCustomerId,
    });

    await stripe.customers.update(context.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const subscription = await getLatestSubscriptionForCustomer(context.stripeCustomerId);

    if (subscription) {
      await stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethodId,
      });
    }

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[billing/attach-payment-method] failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to attach payment method" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
