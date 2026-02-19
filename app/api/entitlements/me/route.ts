import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { userId: null, isPremium: false },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("is_premium")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<{ is_premium: boolean }>();

  if (error) {
    return NextResponse.json(
      { userId: user.id, isPremium: false },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json({ userId: user.id, isPremium: Boolean(data?.is_premium) }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
