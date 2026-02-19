import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewerEntitlement } from "@/lib/entitlements";

export async function POST(request: Request) {
  try {
    const entitlement = await getViewerEntitlement();

    if (!entitlement.userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!entitlement.isPremium) {
      return NextResponse.json({ error: "premium_required" }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          listingId?: string;
          tonnage?: number;
          pricePerTon?: number;
          currency?: string;
        }
      | null;

    const listingId = body?.listingId?.trim();
    const tonnage = Number(body?.tonnage);
    const pricePerTon = Number(body?.pricePerTon);
    const currency = body?.currency?.trim() || "USD";

    if (!listingId || !Number.isFinite(tonnage) || tonnage <= 0 || !Number.isFinite(pricePerTon) || pricePerTon <= 0) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,user_id")
      .eq("id", listingId)
      .single<{ id: string; user_id: string }>();

    if (listingError || !listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404 });
    }

    if (listing.user_id === entitlement.userId) {
      return NextResponse.json({ error: "cannot_offer_own_listing" }, { status: 400 });
    }

    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert([
        {
          listing_id: listing.id,
          buyer_id: entitlement.userId,
          tonnage,
          price_per_ton: pricePerTon,
          currency,
        },
      ])
      .select("id")
      .single();

    if (offerError || !offer?.id) {
      return NextResponse.json({ error: "offer_create_failed" }, { status: 400 });
    }

    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", entitlement.userId)
      .maybeSingle();

    let conversationId = existingConversation?.id ?? null;

    if (!conversationId) {
      const { data: createdConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert([{ listing_id: listing.id, buyer_id: entitlement.userId, seller_id: listing.user_id }])
        .select("id")
        .single();

      if (conversationError || !createdConversation?.id) {
        return NextResponse.json({ error: "conversation_create_failed" }, { status: 400 });
      }

      conversationId = createdConversation.id;
    }

    const { error: messageError } = await supabase.from("messages").insert([
      {
        conversation_id: conversationId,
        sender_id: entitlement.userId,
        content: "Offer sent",
        is_read: false,
        offer_id: offer.id,
      },
    ]);

    if (messageError) {
      return NextResponse.json({ error: "offer_message_create_failed" }, { status: 400 });
    }

    return NextResponse.json({ offerId: offer.id, conversationId });
  } catch (error) {
    console.error("[api/offers] unexpected error", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
