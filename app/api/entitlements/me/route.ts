import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    console.warn("[entitlements/me] unauthenticated request", {
      hasCookieHeader: cookieHeader.length > 0,
      cookieCount: cookieHeader ? cookieHeader.split(";").length : 0,
      hasUserError: Boolean(userError),
    });

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

  return NextResponse.json(
    { userId: user.id, isPremium: Boolean(data?.is_premium) },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
