export type ViewerEntitlementResponse = {
  userId: string | null;
  isPremium: boolean;
};

let hasWarnedUnauthorized = false;

export async function fetchViewerEntitlement(): Promise<ViewerEntitlementResponse> {
  const response = await fetch("/api/entitlements/me", {
    method: "GET",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-store",
    },
    credentials: "include",
  });

  if (response.status === 401) {
    if (!hasWarnedUnauthorized) {
      console.warn("Viewer entitlement request returned 401; treating viewer as free tier.");
      hasWarnedUnauthorized = true;
    }

    return { userId: null, isPremium: false };
  }

  if (!response.ok) {
    return { userId: null, isPremium: false };
  }

  const payload = (await response.json()) as ViewerEntitlementResponse;

  return {
    userId: payload.userId ?? null,
    isPremium: Boolean(payload.isPremium),
  };
}
