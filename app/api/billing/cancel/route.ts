import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingContext, getLatestSubscriptionForCustomer } from "@/app/api/billing/_lib/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const context = await getAuthenticatedBillingContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    if (!context.stripeCustomerId) {
      return NextResponse.json({ error: "No billing customer found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const subscription = await getLatestSubscriptionForCustomer(context.stripeCustomerId);

    if (!subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json(
      {
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          cancel_at_period_end: updatedSubscription.cancel_at_period_end,
          current_period_end: updatedSubscription.current_period_end,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[billing/cancel] failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
