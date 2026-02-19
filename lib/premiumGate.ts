import { redirect } from "next/navigation";
import { getViewerEntitlement } from "@/lib/entitlements";

function getPricingUrl(nextPath: string) {
  return `/pricing?next=${encodeURIComponent(nextPath)}`;
}

export async function requirePremiumServer(redirectTo: string): Promise<{ userId: string }> {
  const entitlement = await getViewerEntitlement();

  if (!entitlement.userId || !entitlement.isPremium) {
    redirect(getPricingUrl(redirectTo));
  }

  return { userId: entitlement.userId };
}
