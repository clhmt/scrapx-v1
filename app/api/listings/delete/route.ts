import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractStoragePathFromPublicUrl,
  LISTINGS_BUCKET,
} from "@/lib/listingImageUtils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Server is missing Supabase configuration" }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const listingId = body?.listingId;

  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const { data: listing, error: listingError } = await adminClient
    .from("listings")
    .select("id,user_id,images")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    return NextResponse.json({ error: listingError.message }, { status: 500 });
  }

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const imagePaths = (listing.images || [])
    .map((value: string) => extractStoragePathFromPublicUrl(value))
    .filter((path: string | null): path is string => Boolean(path));

  if (imagePaths.length > 0) {
    const { error: removeError } = await adminClient.storage.from(LISTINGS_BUCKET).remove(imagePaths);
    if (removeError) {
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await adminClient.from("listings").delete().eq("id", listingId).eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
