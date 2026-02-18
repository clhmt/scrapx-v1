import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ViewerEntitlement = {
  userId: string | null;
  isPremium: boolean;
};

// Single source of truth for viewer premium entitlement.
export async function getViewerEntitlement(): Promise<ViewerEntitlement> {
  noStore();

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (userError) {
        console.error("Entitlement user lookup failed:", userError.message);
      }
      return { userId: null, isPremium: false };
    }

    const { data, error } = await supabase
      .from("user_entitlements")
      .select("is_premium")
      .eq("user_id", user.id)
      .maybeSingle<{ is_premium: boolean }>();

    if (error) {
      console.error("Entitlement query failed:", error.message);
      return { userId: user.id, isPremium: false };
    }

    return { userId: user.id, isPremium: Boolean(data?.is_premium) };
  } catch (error) {
    console.error(
      "Entitlement reader failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return { userId: null, isPremium: false };
  }
}
