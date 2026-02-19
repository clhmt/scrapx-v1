import { getMaskedDisplayName } from "@/lib/privacy";

type NullableString = string | null | undefined;

export type SellerProfileDisplay = {
  full_name?: NullableString;
  first_name?: NullableString;
  last_name?: NullableString;
  company_name?: NullableString;
};

const normalize = (value?: NullableString) => value?.trim() || "";

export function getSellerDisplayLines(
  viewerIsPremium: boolean,
  sellerProfile?: SellerProfileDisplay | null,
) {
  const fullName = normalize(sellerProfile?.full_name);
  const firstName = normalize(sellerProfile?.first_name);
  const lastName = normalize(sellerProfile?.last_name);
  const companyName = normalize(sellerProfile?.company_name);

  const fullFromParts = `${firstName} ${lastName}`.trim();
  const realPrimary = fullName || fullFromParts || companyName || null;

  const primary = getMaskedDisplayName(viewerIsPremium, realPrimary);

  if (!viewerIsPremium) {
    return {
      primary,
      secondary: "ScrapX Member",
    };
  }

  return {
    primary,
    secondary: companyName && companyName !== primary ? companyName : "ScrapX Member",
  };
}

