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
    updated_at?: string;
    created_at: string;
}

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

                return {
                    id: conversation.id,
                    otherUserId,
                    otherUserName,
                    updated_at: conversation.updated_at || undefined,
                    created_at: conversation.created_at,
                };
            });

        const filteredConversations = mappedConversations.filter(Boolean) as ConversationItem[];

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
                                <p className="font-bold text-gray-900">{conversation.otherUserName}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Last active: {new Date(conversation.updated_at || conversation.created_at).toLocaleString()}
                                </p>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
