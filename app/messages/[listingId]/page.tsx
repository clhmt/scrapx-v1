"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";

// --- TİP TANIMLAMASI (HATA BURADAYDI) ---
type Message = {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;    // Veritabanında alt tireli (sender_id)
    receiver_id: string;  // Veritabanında alt tireli (receiver_id)
    listing_id: string;
};

export default function MessagePage() {
    const router = useRouter();
    const params = useParams();
    // TypeScript hatasını önlemek için 'as string' ekledik
    const listingId = params?.listingId as string;

    const [listing, setListing] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!listingId) return; // listingId yoksa çalışma
        fetchData();

        // REAL-TIME ABONELİK (Canlı Mesajlaşma)
        const channel = supabase
            .channel('messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${listingId}` },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => [...prev, newMsg]);
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [listingId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        // 1. İlan Bilgisi
        const { data: listingData } = await supabase.from("listings").select("*").eq("id", listingId).single();
        if (listingData) {
            setListing(listingData);
        }

        // 2. Mesajları Çek
        const { data: msgData } = await supabase
            .from("messages")
            .select("*")
            .eq("listing_id", listingId)
            .order("created_at", { ascending: true });

        setMessages(msgData || []);
        setLoading(false);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !listing) return;

        // Alıcıyı Belirle (İlan sahibi miyim, müşteri miyim?)
        const receiverId = (user.id === listing.user_id) ? user.id : listing.user_id;

        // Mesajı Gönder
        const { error } = await supabase.from("messages").insert({
            content: newMessage,
            sender_id: user.id,        // DÜZELTİLDİ
            receiver_id: receiverId,   // DÜZELTİLDİ
            listing_id: listingId
        });

        if (error) {
            console.error("Error sending:", error);
            alert("Message failed: " + error.message);
        } else {
            setNewMessage("");
        }
    };

    if (loading) return <div className="p-20 text-center">Loading chat...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            {/* HEADER */}
            <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
                <div>
                    <h2 className="font-bold text-lg text-gray-800">{listing?.title || "Chat"}</h2>
                    <p className="text-sm text-green-600 font-bold">${listing?.price}</p>
                </div>
                <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 text-sm font-bold">Close Chat</button>
            </div>

            {/* MESAJ ALANI */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    // Mesaj balonunun yönü (Ben mi attım?)
                    // Not: Basitlik için sender_id == listing.user_id kontrolü yapıyoruz.
                    // Daha gelişmiş versiyonda kendi ID'mizle kıyaslarız.
                    const isListingOwner = msg.sender_id === listing?.user_id;

                    return (
                        <div key={msg.id} className={`flex flex-col ${isListingOwner ? 'items-start' : 'items-end'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl shadow-sm text-sm ${isListingOwner ? 'bg-white text-gray-800 rounded-tl-none' : 'bg-green-100 text-green-900 rounded-tr-none'}`}>
                                {msg.content}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT ALANI */}
            <div className="bg-white p-4 border-t sticky bottom-0">
                <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto">
                    <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 p-3 border rounded-full focus:ring-2 focus:ring-green-500 outline-none bg-gray-50"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold shadow hover:bg-green-700 disabled:opacity-50">
                        ➤
                    </button>
                </form>
            </div>
        </div>
    );
}