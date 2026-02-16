"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

type InboxConversation = {
    id: string;
    buyer_id: string;
    seller_id: string;
    otherUserId: string;
    otherUser: {
        full_name: string | null;
    };
    lastMessage: {
        id: string;
        sender_id: string;
        content: string;
        created_at: string;
        is_read: boolean;
    } | null;
};

function formatMessageTime(isoDate: string) {
    return new Date(isoDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function MessagesInboxPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<InboxConversation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInbox = useCallback(async () => {
        if (!user?.id) {
            setConversations([]);
            setLoading(false);
            return;
        }

        try {
            const { data: convos, error: convoError } = await supabase
                .from("conversations")
                .select("id,buyer_id,seller_id")
                .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

            if (convoError || !convos?.length) {
                setConversations([]);
                return;
            }

            const normalized = await Promise.all(
                convos.map(async (conversation) => {
                    const otherUserId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

                    const [{ data: profile }, { data: lastMessage }] = await Promise.all([
                        supabase.from("users").select("full_name").eq("id", otherUserId).maybeSingle(),
                        supabase
                            .from("messages")
                            .select("id,sender_id,content,created_at,is_read")
                            .eq("conversation_id", conversation.id)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle(),
                    ]);

                    return {
                        ...conversation,
                        otherUserId,
                        otherUser: {
                            full_name: profile?.full_name ?? "Unknown User",
                        },
                        lastMessage: lastMessage ?? null,
                    } as InboxConversation;
                })
            );

            const sorted = normalized
                .filter((item) => item.lastMessage)
                .sort(
                    (a, b) =>
                        new Date(b.lastMessage!.created_at).getTime() -
                        new Date(a.lastMessage!.created_at).getTime()
                );

            setConversations(sorted);
        } catch (error) {
            console.error("Failed to load inbox:", error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchInbox();

        const messagesChannel = supabase
            .channel(`messages_inbox_${user?.id ?? "guest"}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
                fetchInbox();
            })
            .subscribe();

        const handleVisibilitySync = () => fetchInbox();
        const handleReadSync = () => fetchInbox();

        window.addEventListener("focus", handleVisibilitySync);
        document.addEventListener("visibilitychange", handleVisibilitySync);
        window.addEventListener("messages:read-sync", handleReadSync);

        return () => {
            supabase.removeChannel(messagesChannel);
            window.removeEventListener("focus", handleVisibilitySync);
            document.removeEventListener("visibilitychange", handleVisibilitySync);
            window.removeEventListener("messages:read-sync", handleReadSync);
        };
    }, [fetchInbox, user?.id]);

    const hasConversations = useMemo(() => conversations.length > 0, [conversations.length]);

    if (!user) {
        return <div className="p-10 text-center font-semibold text-gray-500">Loading...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => {
                        window.location.href = "/";
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                    Back
                </button>
                <h1 className="text-2xl font-black uppercase tracking-tighter">MESSAGES</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Loading messages...</div>
                ) : !hasConversations ? (
                    <div className="p-10 text-center text-gray-500">No active conversations</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map((conversation) => {
                            const message = conversation.lastMessage;
                            if (!message) return null;

                            const isUnread = message.is_read === false && message.sender_id !== user.id;

                            return (
                                <Link
                                    key={conversation.id}
                                    href={`/messages/direct/${conversation.otherUserId}`}
                                    className="block hover:bg-gray-50 transition-colors p-4"
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0 flex-1 pr-3">
                                            <h3 className={`truncate text-lg ${isUnread ? "font-black text-black" : "font-semibold text-gray-800"}`}>
                                                {conversation.otherUser.full_name || "Unknown User"}
                                            </h3>
                                            <p className={`mt-1 text-sm truncate ${isUnread ? "font-bold text-gray-900" : "text-gray-500"}`}>
                                                {message.content}
                                            </p>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className={`text-xs ${isUnread ? "text-green-600 font-bold" : "text-gray-400"}`}>
                                                {formatMessageTime(message.created_at)}
                                            </span>
                                            {isUnread && <span className="w-3 h-3 bg-green-500 rounded-full shadow-sm" aria-label="Unread" />}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
