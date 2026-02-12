"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { Message } from "@/types";
import Link from "next/link"; // Added missing import

export default function ChatRoom() {
    const params = useParams(); // Should contain listingId
    const searchParams = useSearchParams();
    const listingId = params.listingId as string;
    const otherUserId = searchParams.get("otherUserId"); // Explicitly pass who we are talking to
    const listingType = searchParams.get("type") || "selling"; // 'selling' or 'wanted'

    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [listingTitle, setListingTitle] = useState("Chat");
    const [receiverId, setReceiverId] = useState<string | null>(otherUserId);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        async function fetchChatData() {
            if (!user || !listingId) return;

            try {
                // Fetch listing details for title
                const table = listingType === 'wanted' ? 'wanted_listings' : 'listings';
                const { data: listingData, error: listingError } = await supabase
                    .from(table)
                    .select('title, user_id')
                    .eq('id', listingId)
                    .single();

                if (listingData) {
                    setListingTitle(listingData.title);
                    // If we are the owner, we talk to otherUserId.
                    // If we are NOT the owner, we talk to the owner.
                    if (user.id !== listingData.user_id) {
                        setReceiverId(listingData.user_id);
                    } else if (otherUserId) {
                        setReceiverId(otherUserId);
                    }
                } else {
                    console.error("Error fetching listing:", listingError);
                    setListingTitle("Unknown Listing");
                }

                // Fetch messages
                // We need to filter by listing_id OR wanted_listing_id based on type
                const idColumn = listingType === 'wanted' ? 'wanted_listing_id' : 'listing_id';

                let query = supabase
                    .from('messages')
                    .select('*')
                    .eq(idColumn, listingId)
                    .order('created_at', { ascending: true });

                const targetReceiver = otherUserId || (listingData ? listingData.user_id : null);

                // Filter interaction between ME and TARGET
                if (targetReceiver) {
                    // We only want messages between ME and TARGET for this listing context
                    // (Because a seller might have chats with 10 different buyers for the same listing)
                    query = query.or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetReceiver}),and(sender_id.eq.${targetReceiver},receiver_id.eq.${user.id})`);
                } else {
                    // Fallback (unsafe): fetch all my messages for this listing?
                    // This happens if I am owner and open /messages/[id] without otherUserId.
                    // Ideally we should redirect to Inbox or show a list of conversations.
                    // For now, let's just fetch everything involved with me.
                    query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
                }

                const { data: msgs, error } = await query;

                if (error) throw error;
                setMessages(msgs || []);

                // Realtime subscription
                const channel = supabase
                    .channel(`chat:${listingId}`)
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `${idColumn}=eq.${listingId}`
                    }, (payload) => {
                        const newMsg = payload.new as Message;
                        // Check if it belongs to this conversation (Me <-> Receiver)
                        const currentReceiver = targetReceiver;
                        if (
                            (newMsg.sender_id === user.id && newMsg.receiver_id === currentReceiver) ||
                            (newMsg.sender_id === currentReceiver && newMsg.receiver_id === user.id)
                        ) {
                            setMessages(prev => [...prev, newMsg]);
                        }
                    })
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };

            } catch (error) {
                console.error("Error fetching chat:", error);
            } finally {
                setLoading(false);
            }
        }

        if (user) {
            fetchChatData();
        }
    }, [user, listingId, otherUserId, listingType]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !receiverId) {
            if (!receiverId) alert("Cannot determine who to send message to.");
            return;
        }

        try {
            const messageData: any = {
                sender_id: user.id,
                receiver_id: receiverId,
                content: newMessage,
                read: false,
                created_at: new Date()
            };

            if (listingType === 'wanted') {
                messageData.wanted_listing_id = listingId;
            } else {
                messageData.listing_id = listingId;
            }

            const { error } = await supabase
                .from('messages')
                .insert(messageData);

            if (error) throw error;

            setNewMessage("");
        } catch (error: any) {
            console.error("Error sending message:", error);
            alert("Failed to send message: " + error.message);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <Navbar />

            <div className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
                {/* Header */}
                <div className="bg-white p-4 rounded-t-lg shadow-sm border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 truncate max-w-md">
                            {listingTitle}
                        </h1>
                        <p className="text-xs text-gray-500">
                            {listingType === 'wanted' ? 'Wanted Request' : 'Listing'} • Chat with {otherUserId ? "User" : "Owner"}
                        </p>
                    </div>
                    <Link
                        href={listingType === 'wanted' ? `/wanted` : `/listings/${listingId}`}
                        className="text-sm text-emerald-600 hover:underline"
                    >
                        View {listingType === 'wanted' ? 'Feed' : 'Listing'}
                    </Link>
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-white overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">
                            No messages yet. {listingType === 'wanted' ? 'Offer your supply!' : 'Say hello!'} 👋
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg text-sm ${isMe
                                        ? 'bg-emerald-600 text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-900 rounded-bl-none'
                                        }`}>
                                        <p>{msg.content}</p>
                                        <p className={`text-xs mt-1 text-right ${isMe ? 'text-emerald-100' : 'text-gray-500'}`}>
                                            {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white p-4 rounded-b-lg shadow-sm border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-6 h-6 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
