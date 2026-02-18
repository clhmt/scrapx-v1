import { NextResponse } from "next/server";
import { getViewerEntitlement } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET() {
  const entitlement = await getViewerEntitlement();

  return NextResponse.json(entitlement, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
