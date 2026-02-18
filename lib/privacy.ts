export function getMaskedDisplayName(viewerIsPremium: boolean, realName?: string | null) {
  if (!viewerIsPremium) {
    return "ScrapX Seller";
  }

  const normalizedName = realName?.trim();

  return normalizedName || "ScrapX Seller";
}
