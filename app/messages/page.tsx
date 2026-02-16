"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ConversationRow {
    id: string;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    updated_at: string | null;
}

interface UserRow {
    id: string;
    full_name: string | null;
    email: string | null;
}

interface ConversationItem {
    id: string;
    otherUserId: string;
    otherUserName: string;
    lastMessageContent: string;
    lastMessageCreatedAt?: string;
    hasUnread: boolean;
    updated_at?: string;
    created_at: string;
}

interface MessageRow {
    conversation_id: string;
    content: string | null;
    created_at: string;
    is_read: boolean;
    sender_id: string;
}

const formatMessageTime = (timestamp?: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const isSameDay = date.toDateString() === now.toDateString();

    if (isSameDay) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const truncateMessage = (content: string, maxLength = 70) => {
    if (content.length <= maxLength) return content;
    return `${content.slice(0, maxLength - 3)}...`;
};

export default function MessagesInbox() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async (currentUserId: string) => {
        setLoading(true);

        const { data: conversationData, error } = await supabase
            .from("conversations")
            .select("id, buyer_id, seller_id, created_at, updated_at")
            .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Conversation fetch error:", error);
            setConversations([]);
            setLoading(false);
            return;
        }

        const rows = (conversationData || []) as ConversationRow[];

        const conversationIds = rows.map((row) => row.id);
        const lastMessagesMap = new Map<string, MessageRow>();

        if (conversationIds.length > 0) {
            const { data: messagesData, error: messagesError } = await supabase
                .from("messages")
                .select("conversation_id, content, created_at, is_read, sender_id")
                .in("conversation_id", conversationIds)
                .order("created_at", { ascending: false });

            if (messagesError) {
                console.error("Messages fetch error:", messagesError);
            } else {
                ((messagesData || []) as MessageRow[]).forEach((message) => {
                    if (!lastMessagesMap.has(message.conversation_id)) {
                        lastMessagesMap.set(message.conversation_id, message);
                    }
                });
            }
        }

        const otherUserIds = Array.from(
            new Set(
                rows
                    .map((convo) => {
                        const otherUserId = convo.buyer_id === currentUserId ? convo.seller_id : convo.buyer_id;
                        return otherUserId;
                    })
                    .filter((id): id is string => Boolean(id) && id !== currentUserId)
            )
        );

        let usersMap = new Map<string, UserRow>();

        if (otherUserIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select("id, full_name, email")
                .in("id", otherUserIds);

            if (usersError) {
                console.error("Users fetch error:", usersError);
            } else {
                usersMap = new Map(((usersData || []) as UserRow[]).map((u) => [u.id, u]));
            }
        }

        const mappedConversations = rows.map((conversation) => {
                const otherUserId = conversation.buyer_id === currentUserId ? conversation.seller_id : conversation.buyer_id;

                if (!otherUserId || otherUserId === currentUserId) {
                    return null;
                }

                const otherUser = usersMap.get(otherUserId);
                const fallbackFromEmail = otherUser?.email?.split("@")[0];
                const otherUserName = otherUser?.full_name?.trim() || fallbackFromEmail || "ScrapX User";
                const lastMessage = lastMessagesMap.get(conversation.id);
                const lastMessageContent = lastMessage?.content?.trim() || "No messages yet";
                const hasUnread = Boolean(lastMessage && !lastMessage.is_read && lastMessage.sender_id !== currentUserId);

                return {
                    id: conversation.id,
                    otherUserId,
                    otherUserName,
                    lastMessageContent,
                    lastMessageCreatedAt: lastMessage?.created_at,
                    hasUnread,
                    updated_at: conversation.updated_at || undefined,
                    created_at: conversation.created_at,
                };
            });

        const filteredConversations = mappedConversations.filter(Boolean) as ConversationItem[];

        filteredConversations.sort((a, b) => {
            const aTime = new Date(a.lastMessageCreatedAt || a.updated_at || a.created_at).getTime();
            const bTime = new Date(b.lastMessageCreatedAt || b.updated_at || b.created_at).getTime();
            return bTime - aTime;
        });

        setConversations(filteredConversations);
        setLoading(false);
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        } else if (user) {
            queueMicrotask(() => {
                fetchConversations(user.id);
            });
        }
    }, [user, authLoading, router]);

    if (authLoading || loading) return <div className="p-20 text-center font-bold">Loading Messages...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter">Messages</h1>
                <div className="bg-white rounded-2xl border shadow-sm divide-y">
                    {conversations.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">No active conversations.</div>
                    ) : (
                        conversations.map((conversation) => (
                            <Link
                                key={conversation.id}
                                href={`/messages/direct/${conversation.otherUserId}`}
                                className="block p-5 hover:bg-gray-50 transition"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-900 truncate">{conversation.otherUserName}</p>
                                        <p className={`text-sm mt-1 truncate ${conversation.hasUnread ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                                            {truncateMessage(conversation.lastMessageContent)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className="text-xs text-gray-500">
                                            {formatMessageTime(conversation.lastMessageCreatedAt || conversation.updated_at || conversation.created_at)}
                                        </span>
                                        {conversation.hasUnread ? (
                                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-500" aria-label="Unread message" />
                                        ) : null}
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
