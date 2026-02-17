"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type MessageRow = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
};

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
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
                const { data: userProfile } = await supabase
                    .from("users")
                    .select("full_name,company_name")
                    .eq("id", targetUserId)
                    .maybeSingle();

                setTargetUser(userProfile ?? { full_name: "Unknown User", company_name: null });

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
                    .select("id,conversation_id,sender_id,content,created_at,is_read")
                    .eq("conversation_id", resolvedConversationId)
                    .order("created_at", { ascending: true });

                const normalizedMessages = existingMessages ?? [];
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
                    const insertedMessage = payload.new as MessageRow;

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
            .select("id,conversation_id,sender_id,content,created_at,is_read")
            .single();

        if (error || !inserted) {
            console.error("Failed to send message:", error);
            setMessages((prev) => prev.filter((row) => row.id !== tempId));
            setNewMessage(content);
            return;
        }

        setMessages((prev) => prev.map((row) => (row.id === tempId ? (inserted as MessageRow) : row)));
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
                            {loading ? "Connecting..." : targetUser?.full_name || "Unknown User"}
                        </h2>
                        <p className="text-sm text-gray-500">{targetUser?.company_name || "Direct Message"}</p>
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
                                    <p>{message.content}</p>
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
