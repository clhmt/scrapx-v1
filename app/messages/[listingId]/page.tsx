"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const formatPrice = (price: number) => {
    if (!price) return "0 USD";
    return new Intl.NumberFormat('en-US').format(price) + " USD";
};

// WhatsApp'a kaçmayı engelleyen Sansür Fonksiyonu
const filterContactInfo = (text: string) => {
    let filtered = text.replace(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/gi, ' [EMAIL HIDDEN BY SCRAPX] ');
    filtered = filtered.replace(/(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,10}/g, ' [PHONE HIDDEN BY SCRAPX] ');
    return filtered;
};

export default function ChatPage() {
    const params = useParams();
    const listingId = params.listingId || params.id;

    const router = useRouter();
    const { user } = useAuth() as any;

    const [listing, setListing] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) {
            router.push("/auth");
        } else if (listingId) {
            initChat();
        }
    }, [user, listingId]);

    // Mesajlar geldiğinde otomatik en alta kaydır
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const initChat = async () => {
        setLoading(true);

        // 1. İlanı bul
        const { data: listingData } = await supabase.from("listings").select("*").eq("id", listingId).single();
        if (!listingData) {
            alert("Error: Listing not found.");
            return setLoading(false);
        }
        setListing(listingData);

        // 2. Kullanıcı Satıcı mı Alıcı mı?
        const isSeller = user.id === listingData.user_id;
        const sellerId = listingData.user_id;

        // Kendi kendine mesaj atmasını engelle
        if (isSeller) {
            alert("This is your own listing. Buyers will contact you here.");
            router.push(`/listings/${listingId}`);
            return;
        }

        // 3. Konuşma odası var mı kontrol et, yoksa oluştur
        let convId;
        const { data: existingConv } = await supabase.from("conversations")
            .select("*").eq("listing_id", listingId).eq("buyer_id", user.id).single();

        if (existingConv) {
            convId = existingConv.id;
        } else {
            // HATA YAKALAMA BURADA BAŞLIYOR
            const { data: newConv, error: convError } = await supabase.from("conversations")
                .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
                .select().single();

            if (convError) {
                console.error("Conversation Error:", convError);
                alert("Sistem Hatası: Sohbet odası kurulamadı.\n\nSebep: " + convError.message + "\n\n(Bu büyük ihtimalle eski bir ilan ve satıcı hesabı veritabanından silinmiş. Lütfen platformda yeni bir ilan açıp onun üzerinden test yapın!)");
                setLoading(false);
                return;
            }
            convId = newConv?.id;
        }

        if (convId) {
            setConversationId(convId);
            fetchMessages(convId);
        }
        setLoading(false);
    };

    const fetchMessages = async (convId: string) => {
        const { data } = await supabase.from("messages")
            .select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
        setMessages(data || []);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // EĞER ODA KURULAMADIYSA MESAJ ATMASINI ENGELLE
        if (!conversationId) {
            alert("Hata: Sohbet odası henüz hazır değil. Sayfayı yenileyin veya farklı (yeni) bir ilan üzerinde test yapın.");
            return;
        }

        // SANSÜRLEME İŞLEMİ (WhatsApp engeli)
        const safeContent = filterContactInfo(newMessage);

        const msgToSend = {
            conversation_id: conversationId,
            sender_id: user.id,
            content: safeContent
        };

        // Ekrana anında ekle (kullanıcı beklediğini hissetmesin)
        setMessages((prev) => [...prev, { ...msgToSend, created_at: new Date().toISOString() }]);
        setNewMessage("");

        const response = await fetch("/api/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                conversationId,
                content: safeContent,
            }),
        });

        if (!response.ok) {
            if (response.status === 403) {
                window.location.assign(`/pricing?next=${encodeURIComponent(`/messages/${listingId}`)}`);
                return;
            }

            alert("Mesaj gönderilemedi. Lütfen tekrar deneyin.");
        }
    };

    if (loading) return <div className="p-20 text-center font-bold">Connecting to secure chat...</div>;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Navbar />

            {/* İlan Özeti */}
            {listing && (
                <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border">
                            {listing.images?.[0] ? <img src={listing.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-400">NO IMG</div>}
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900 leading-tight">{listing.title}</h2>
                            <p className="text-green-600 font-bold text-sm">{formatPrice(listing.price)} <span className="text-gray-400 text-xs">/ {listing.unit}</span></p>
                        </div>
                    </div>
                    <Link href={`/listings/${listingId}`} className="text-xs font-bold text-gray-500 hover:text-gray-800 border px-4 py-2 rounded-lg bg-gray-50">
                        Close Chat
                    </Link>
                </div>
            )}

            {/* GÜVENLİK UYARISI (WhatsApp Engelleyici) */}
            <div className="bg-yellow-50 border-b border-yellow-200 p-3 text-center">
                <p className="text-xs font-bold text-yellow-800 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    Safety Warning: Do not share phone numbers or move to WhatsApp. ScrapX protection only applies to deals made on platform.
                </p>
            </div>

            {/* Mesajlaşma Alanı */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <svg className="w-12 h-12 mb-3 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                        <p className="font-bold">Start the negotiation</p>
                        <p className="text-sm">Send a message to the seller to make an offer.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[75%] px-5 py-3 rounded-2xl ${isMe ? "bg-[#52A04A] text-white rounded-br-sm shadow-md" : "bg-white border text-gray-800 rounded-bl-sm shadow-sm"}`}>
                                    <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                                    <span className={`text-[9px] mt-1 block font-bold ${isMe ? "text-green-100" : "text-gray-400"}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Mesaj Yazma Alanı */}
            <div className="bg-white border-t p-4 pb-8">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message or make an offer..."
                        className="flex-1 border-2 border-gray-200 rounded-full px-6 py-4 focus:outline-none focus:border-green-500 font-medium bg-gray-50"
                    />
                    <button
                        type="submit"
                        // Oda hazır değilse butonu deaktif (soluk) yapıyoruz
                        disabled={!newMessage.trim() || !conversationId}
                        className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed absolute right-2 top-0.5"
                    >
                        <svg className="w-5 h-5 ml-1 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
