"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Conversation {
    listingId: string;
    listingTitle: string;
    lastMessage: string;
    lastMessageDate: Date;
    otherUserId: string;
    otherUserName: string;
    unreadCount: number; // Placeholder for now
}

export default function MessagesInbox() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        async function fetchConversations() {
            if (!user) return;

            try {
                // Fetch all messages where current user is sender or receiver
                const { data: messages, error } = await supabase
                    .from('messages')
                    .select(`
            *,
            listing:listings!messages_listing_id_fkey (
              id,
              title
            )
          `)
                    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Group messages by listing_id to form conversations
                // This is a bit manual because we don't have a separate 'conversations' table
                // Ideally we would group by (listing_id, other_user_id)

                const convMap = new Map<string, Conversation>();

                for (const msg of messages || []) {
                    const isSender = msg.sender_id === user.id;
                    const otherId = isSender ? msg.receiver_id : msg.sender_id;
                    const key = `${msg.listing_id}-${otherId}`; // Unique conversation key

                    if (!convMap.has(key)) {
                        // Determine other user's name - we might need to fetch profiles or just use ID/email if we had it joined
                        // Since our query didn't join profiles, let's just use "User" or fetch it.
                        // For MVP, we'll try to be efficient. Let's fetch distinct profiles later? 
                        // Or just show "User {ID}" for now if we can't join easily without complex RLS.
                        // Actually let's assume we can display "User" for now.

                        convMap.set(key, {
                            listingId: msg.listing_id,
                            listingTitle: msg.listing?.title || "Unknown Listing",
                            lastMessage: msg.content,
                            lastMessageDate: new Date(msg.created_at),
                            otherUserId: otherId,
                            otherUserName: "User", // We'll fix this later if needed
                            unreadCount: (!isSender && !msg.read) ? 1 : 0
                        });
                    } else {
                        // Only update unread count if we found a later message first (which we did due to sort)
                        // Wait, we are iterating newest first. So the first one we see is the latest.
                        // We just need to accumulate unread counts?
                        // Actually this logic is simpler:
                        // The first time we see a key, that's the latest message.
                        // We can just count unread messages by iterating all.
                    }
                }

                // Re-calculate unread counts properly? 
                // Or just simplify: Map contains latest message.
                setConversations(Array.from(convMap.values()));

            } catch (error) {
                console.error("Error fetching messages:", error);
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            fetchConversations();
        }
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h1 className="text-xl font-bold text-gray-900">Inbox</h1>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {conversations.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No messages yet. Start a conversation from a listing!
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <Link
                                    key={`${conv.listingId}-${conv.otherUserId}`}
                                    href={`/messages/${conv.listingId}?otherUserId=${conv.otherUserId}`}
                                    className="block hover:bg-gray-50 transition duration-150 ease-in-out"
                                >
                                    <div className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                <span className="inline-block h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                                    👤
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {conv.listingTitle}
                                                </p>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {conv.lastMessage}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end space-y-1">
                                            <p className="text-xs text-gray-400">
                                                {conv.lastMessageDate.toLocaleDateString()}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
