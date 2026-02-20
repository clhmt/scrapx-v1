import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getAuthenticatedBillingSummary } from "@/lib/billing/getBillingSummary";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();

  try {
    const billing = await getAuthenticatedBillingSummary();

    if (!billing) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(billing.summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[billing/summary] failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load billing summary" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
