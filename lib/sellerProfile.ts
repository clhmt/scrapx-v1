import { supabase } from "@/lib/supabaseClient";

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

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("is_premium,status,current_period_end,premium_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;

  if (!data.is_premium) return false;
  if (data.status && data.status !== "active" && data.status !== "trialing") return false;

  const entitlementEndsAt = data.current_period_end || data.premium_until;

  if (!entitlementEndsAt) return true;

  return new Date(entitlementEndsAt).getTime() > Date.now();
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
