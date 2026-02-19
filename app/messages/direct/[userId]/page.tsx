"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getMaskedDisplayName } from "@/lib/privacy";
import { fetchViewerPremiumState } from "@/lib/sellerProfile";
import { supabase } from "@/lib/supabaseClient";

type MessageRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    offer_id: string | null;
    offer: {
        id: string;
        tonnage: number;
        price_per_ton: number;
        currency: string;
        status: string;
        seller_id: string;
    } | null;
};

type MessageQueryRow = Omit<MessageRow, "offer"> & {
    offer:
        | {
              id: string;
              tonnage: number;
              price_per_ton: number;
              currency: string;
              status: string;
              seller_id: string;
          }
        | {
              id: string;
              tonnage: number;
              price_per_ton: number;
              currency: string;
              status: string;
              seller_id: string;
          }[]
        | null;
};

type OfferStatus = "pending" | "accepted" | "rejected";

const messageSelect = "id,conversation_id,sender_id,content,created_at,is_read,offer_id,offer:offers(id,tonnage,price_per_ton,currency,status,seller_id)";

function normalizeMessageRow(message: MessageQueryRow): MessageRow {
    return {
        ...message,
        offer: Array.isArray(message.offer) ? (message.offer[0] ?? null) : message.offer,
    };
}

function formatMessageTime(isoDate: string) {
    return new Date(isoDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function DirectMessagePage() {
    const { user } = useAuth();
    const params = useParams();
    const searchParams = useSearchParams();
    const urlConvoId = searchParams?.get("convo");
    const targetUserId = useMemo(() => {
        const rawParam = params?.userId;
        if (Array.isArray(rawParam)) return rawParam[0] ?? "";
        return (rawParam as string) ?? "";
    }, [params?.userId]);

    const [messages, setMessages] = useState<MessageRow[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [targetUser, setTargetUser] = useState<{ full_name: string | null; company_name: string | null } | null>(null);
    const [isPremiumViewer, setIsPremiumViewer] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [updatingOfferId, setUpdatingOfferId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const offerIdsRef = useRef<Set<string>>(new Set());

    const fetchMessageById = async (messageId: string) => {
        const { data } = await supabase
            .from("messages")
            .select(messageSelect)
            .eq("id", messageId)
            .maybeSingle();

        return data ? normalizeMessageRow(data as MessageQueryRow) : null;
    };

    useEffect(() => {
        if (!user?.id) return;

        if (!targetUserId || targetUserId === "null" || targetUserId === "undefined") {
            setErrorMsg("Invalid message link. Please open this chat from your inbox.");
            setLoading(false);
            return;
        }

        const initDirectMessage = async () => {
            setLoading(true);
            setErrorMsg("");

            try {
                const premiumState = await fetchViewerPremiumState(user.id);
                setIsPremiumViewer(premiumState);

                const { data: userProfile } = await supabase
                    .from("users")
                    .select("full_name,company_name")
                    .eq("id", targetUserId)
                    .maybeSingle();

                setTargetUser(userProfile ?? { full_name: null, company_name: null });

                let resolvedConversationId = urlConvoId ?? null;

                if (!resolvedConversationId) {
                    const { data: conversations } = await supabase
                        .from("conversations")
                        .select("id,buyer_id,seller_id")
                        .or(
                            `and(buyer_id.eq.${user.id},seller_id.eq.${targetUserId}),and(buyer_id.eq.${targetUserId},seller_id.eq.${user.id})`
                        )
                        .is("listing_id", null)
                        .limit(1);

                    resolvedConversationId = conversations?.[0]?.id ?? null;

                    if (!resolvedConversationId) {
                        const { data: createdConversation, error: createError } = await supabase
                            .from("conversations")
                            .insert([{ buyer_id: user.id, seller_id: targetUserId }])
                            .select("id")
                            .single();

                        if (createError || !createdConversation?.id) {
                            throw new Error("Failed to create a direct conversation.");
                        }

                        resolvedConversationId = createdConversation.id;
                    }
                }

                setConversationId(resolvedConversationId);

                const { data: existingMessages } = await supabase
                    .from("messages")
                    .select(messageSelect)
                    .eq("conversation_id", resolvedConversationId)
                    .order("created_at", { ascending: true });

                const normalizedMessages = ((existingMessages as MessageQueryRow[] | null) ?? []).map(normalizeMessageRow);
                setMessages(normalizedMessages);

                const unreadIds = normalizedMessages
                    .filter((msg) => msg.is_read === false && msg.sender_id !== user.id)
                    .map((msg) => msg.id);

                if (unreadIds.length > 0) {
                    const { error: markReadError } = await supabase
                        .from("messages")
                        .update({ is_read: true })
                        .in("id", unreadIds);

                    if (markReadError) {
                        console.error("Update error:", markReadError);
                    }
                }

                window.dispatchEvent(new Event("messages:read-sync"));
            } catch (error) {
                console.error("Failed to initialize direct message:", error);
                setErrorMsg("Unable to load this conversation.");
            } finally {
                setLoading(false);
            }
        };

        initDirectMessage();
    }, [user?.id, targetUserId, urlConvoId]);

    useEffect(() => {
        if (!conversationId || !user?.id) return;

        const channel = supabase
            .channel(`direct_messages_${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                async (payload) => {
                    const payloadMessage = payload.new as { id: string; sender_id: string; is_read: boolean };
                    const insertedMessage = await fetchMessageById(payloadMessage.id);

                    if (!insertedMessage) return;

                    setMessages((prev) => {
                        if (prev.some((row) => row.id === insertedMessage.id)) return prev;
                        return [...prev, insertedMessage];
                    });

                    if (insertedMessage.sender_id !== user.id) {
                        await supabase
                            .from("messages")
                            .update({ is_read: true })
                            .eq("id", insertedMessage.id)
                            .eq("is_read", false);

                        window.dispatchEvent(new Event("messages:read-sync"));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, user?.id]);

    useEffect(() => {
        offerIdsRef.current = new Set(messages.map((message) => message.offer_id).filter((offerId): offerId is string => !!offerId));
    }, [messages]);

    useEffect(() => {
        if (!conversationId) return;

        const offerChannel = supabase
            .channel(`direct_offers_${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "offers",
                },
                async (payload) => {
                    const updatedOfferId = (payload.new as { id?: string } | null)?.id;
                    if (!updatedOfferId) return;

                    if (!offerIdsRef.current.has(updatedOfferId)) return;

                    const { data: refreshedOffer } = await supabase
                        .from("offers")
                        .select("id,tonnage,price_per_ton,currency,status,seller_id")
                        .eq("id", updatedOfferId)
                        .maybeSingle();

                    if (!refreshedOffer) return;

                    setMessages((prev) =>
                        prev.map((message) =>
                            message.offer_id === updatedOfferId
                                ? {
                                      ...message,
                                      offer: {
                                          id: refreshedOffer.id,
                                          tonnage: refreshedOffer.tonnage,
                                          price_per_ton: refreshedOffer.price_per_ton,
                                          currency: refreshedOffer.currency,
                                          status: refreshedOffer.status,
                                          seller_id: refreshedOffer.seller_id,
                                      },
                                  }
                                : message
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(offerChannel);
        };
    }, [conversationId]);

    const handleOfferAction = async (offerId: string, status: OfferStatus) => {
        if (!user?.id || (status !== "accepted" && status !== "rejected")) return;

        setUpdatingOfferId(offerId);

        const { data: updatedOffer, error } = await supabase
            .from("offers")
            .update({ status })
            .eq("id", offerId)
            .eq("seller_id", user.id)
            .eq("status", "pending")
            .select("id,status")
            .maybeSingle();

        if (error || !updatedOffer) {
            console.error("Failed to update offer status:", error);
            alert("Failed to update offer status. Please try again.");
            setUpdatingOfferId(null);
            return;
        }

        setMessages((prev) =>
            prev.map((message) =>
                message.offer_id === offerId && message.offer
                    ? {
                          ...message,
                          offer: {
                              ...message.offer,
                              status,
                          },
                      }
                    : message
            )
        );

        setUpdatingOfferId(null);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newMessage.trim() || !conversationId || !user?.id) return;

        const content = newMessage.trim();
        setNewMessage("");

        const tempId = `temp-${crypto.randomUUID()}`;
        const optimisticMessage: MessageRow = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: user.id,
            content,
            created_at: new Date().toISOString(),
            is_read: false,
            offer_id: null,
            offer: null,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const { data: inserted, error } = await supabase
            .from("messages")
            .insert([
                {
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content,
                    is_read: false,
                },
            ])
            .select(messageSelect)
            .single();

        if (error || !inserted) {
            console.error("Failed to send message:", error);
            setMessages((prev) => prev.filter((row) => row.id !== tempId));
            setNewMessage(content);
            return;
        }

        const normalizedInserted = normalizeMessageRow(inserted as MessageQueryRow);
        setMessages((prev) => prev.map((row) => (row.id === tempId ? normalizedInserted : row)));
    };

    if (!user) {
        return <div className="p-10 text-center text-gray-500">Loading...</div>;
    }

    if (errorMsg) {
        return (
            <div className="p-10 text-center flex flex-col items-center">
                <p className="text-red-500 font-bold mb-4">{errorMsg}</p>
                <button
                    onClick={() => {
                        window.location.href = "/messages";
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                    Back
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="font-bold text-lg">
                            {loading ? "Connecting..." : getMaskedDisplayName(isPremiumViewer, targetUser?.full_name)}
                        </h2>
                        <p className="text-sm text-gray-500">{isPremiumViewer ? targetUser?.company_name || "Direct Message" : "Direct Message"}</p>
                    </div>
                    <button
                        onClick={async (e) => {
                            e.preventDefault();
                            if (conversationId && user) {
                                const { error } = await supabase
                                    .from("messages")
                                    .update({ is_read: true })
                                    .eq("conversation_id", conversationId)
                                    .neq("sender_id", user.id)
                                    .eq("is_read", false);

                                if (error) console.error("Update error:", error);
                            }
                            window.location.href = "/messages";
                        }}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                        Back
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {!loading && messages.length === 0 && (
                        <div className="text-center text-gray-500 mt-10">No messages yet. Start the conversation.</div>
                    )}

                    {messages.map((message) => {
                        const isMine = message.sender_id === user.id;
                        return (
                            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                                        isMine
                                            ? "bg-green-600 text-white rounded-tr-sm"
                                            : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                                    }`}
                                >
                                    {message.offer_id && message.offer ? (
                                        <div
                                            className={`space-y-1 rounded-lg p-2 -mx-1 ${
                                                message.offer.status === "accepted"
                                                    ? "border border-green-200 bg-green-50/60"
                                                    : message.offer.status === "rejected"
                                                      ? "border border-red-200 bg-red-50/60"
                                                      : ""
                                            }`}
                                        >
                                            <p className={`text-[11px] font-black tracking-wide ${isMine ? "text-green-100" : "text-gray-500"}`}>OFFER</p>
                                            <p className="font-semibold">
                                                {message.offer.tonnage} tons at ${new Intl.NumberFormat("en-US").format(message.offer.price_per_ton)}/ton
                                            </p>
                                            <p className="font-semibold">
                                                Total: ${new Intl.NumberFormat("en-US").format(message.offer.tonnage * message.offer.price_per_ton)}
                                            </p>
                                            <p className={`text-sm font-bold ${isMine ? "text-green-100" : "text-gray-600"}`}>
                                                Status: {message.offer.status.charAt(0).toUpperCase() + message.offer.status.slice(1)}
                                            </p>
                                            {message.offer.seller_id === user.id && message.offer.status === "pending" && (
                                                <div className="pt-1 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOfferAction(message.offer!.id, "accepted")}
                                                        disabled={updatingOfferId === message.offer!.id}
                                                        className="px-3 py-1 text-xs font-semibold rounded-md border border-green-600 text-green-700 bg-white hover:bg-green-50 disabled:opacity-60"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOfferAction(message.offer!.id, "rejected")}
                                                        disabled={updatingOfferId === message.offer!.id}
                                                        className="px-3 py-1 text-xs font-semibold rounded-md border border-red-600 text-red-700 bg-white hover:bg-red-50 disabled:opacity-60"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {!!message.content && <p>{message.content}</p>}
                                        </div>
                                    ) : (
                                        <p>{message.content}</p>
                                    )}
                                    <span className={`text-[10px] block mt-1 ${isMine ? "text-green-200" : "text-gray-400"}`}>
                                        {formatMessageTime(message.created_at)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(event) => setNewMessage(event.target.value)}
                            placeholder="Type a message..."
                            disabled={loading || !conversationId}
                            className="flex-1 border-2 border-gray-200 rounded-full px-6 py-3 focus:outline-none focus:border-green-600 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || !conversationId || loading}
                            className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-green-700 transition-colors"
                            aria-label="Send message"
                        >
                            <svg
                                className="w-5 h-5 ml-1 transform rotate-45"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                                />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
