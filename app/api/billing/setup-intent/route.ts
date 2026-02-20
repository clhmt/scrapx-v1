import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthenticatedBillingContext } from "@/app/api/billing/_lib/server";

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

    const setupIntent = await stripe.setupIntents.create({
      customer: context.stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[billing/setup-intent] failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to create setup intent" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
