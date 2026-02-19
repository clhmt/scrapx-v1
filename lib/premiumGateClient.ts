"use client";

import { fetchViewerEntitlement } from "@/lib/entitlements-client";

function getPricingUrl(nextPath: string) {
  return `/pricing?next=${encodeURIComponent(nextPath)}`;
}

export async function requirePremiumClient(nextPath: string): Promise<void> {
  const entitlement = await fetchViewerEntitlement();

  if (!entitlement.isPremium) {
    console.info("[premium-gate] redirecting free user", { nextPath });
    window.location.assign(getPricingUrl(nextPath));
  }
}
