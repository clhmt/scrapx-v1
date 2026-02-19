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
          conversationId?: string;
          content?: string;
          offerId?: string | null;
        }
      | null;

    const conversationId = body?.conversationId?.trim();
    const content = body?.content?.trim();

    if (!conversationId || !content) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: entitlement.userId,
          content,
          is_read: false,
          offer_id: body?.offerId ?? null,
        },
      ])
      .select("id")
      .single();

    if (error || !data?.id) {
      return NextResponse.json({ error: "message_create_failed" }, { status: 400 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("[api/messages] unexpected error", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
