import { supabase } from "@/lib/supabaseClient";
import { getMaskedDisplayName } from "@/lib/privacy";
import { fetchViewerEntitlement } from "@/lib/entitlements-client";

type SellerProfile = {
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  created_at?: string | null;
};

export async function fetchPublicSellerProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
     .select("user_id,first_name,last_name,full_name,company_name,created_at")
    .eq("user_id", userId)
    .maybeSingle<SellerProfile>();

  if (error) {
    return null;
  }

  return data;
}

export async function fetchPrivateContactIfAllowed(userId: string) {
  const { data, error } = await supabase
    .from("profile_private")
    .select("email,phone")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export async function fetchViewerPremiumState(userId?: string | null) {
  if (!userId) return false;

  const entitlement = await fetchViewerEntitlement();
  return entitlement.userId === userId ? entitlement.isPremium : false;
}

export async function fetchCurrentViewerPremiumState() {
  const entitlement = await fetchViewerEntitlement();
  return entitlement.isPremium;
}

export async function fetchPremiumOfferCount(listingId: string) {
  const { data, error } = await supabase.rpc("get_listing_offer_count_if_premium", {
    target_listing_id: listingId,
  });

  if (error || data === null || data === undefined) return null;

  return Number(data);
}

export function getDisplayName(profile: SellerProfile | null, fallbackEmail?: string | null) {
  const first = profile?.first_name?.trim();
  const last = profile?.last_name?.trim();
  const combined = [first, last].filter(Boolean).join(" ").trim();

  if (combined) return combined;

  if (profile?.full_name?.trim()) return profile.full_name.trim();

  if (fallbackEmail) return fallbackEmail.split("@")[0];

  return "ScrapX Seller";
}

export function getSellerDisplayNameForViewer(
  profile: SellerProfile | null,
  viewerIsPremium: boolean,
  fallbackEmail?: string | null
) {
  return getMaskedDisplayName(viewerIsPremium, getDisplayName(profile, fallbackEmail));
}
