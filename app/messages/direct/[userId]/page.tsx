"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useParams } from "next/navigation";

export default function DirectMessagePage() {
    const { user } = useAuth() as any;
    const router = useRouter();
    const params = useParams();
    const targetUserId = params?.userId as string;

    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [targetUser, setTargetUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Odayı Kurma ve Geçmişi Çekme
    useEffect(() => {
        if (!user || !targetUserId) return;
        if (targetUserId === "null") {
            setErrorMsg("Hatalı bağlantı: Kullanıcı bulunamadı. Lütfen ilanlar veya gelen kutusu üzerinden tekrar deneyin.");
            setLoading(false);
            return;
        }

        const initChat = async () => {
            try {
                // Karşıdaki kişiyi bul
                const { data: tUser } = await supabase.from("users").select("full_name, company_name").eq("id", targetUserId).single();
                if (tUser) setTargetUser(tUser);

                // Supabase'in kafasını karıştıran karmaşık OR sorgusu yerine, doğrudan iki basit arama yapıyoruz:
                // 1. İhtimal: Sen Alıcı, O Satıcı
                const { data: convo1 } = await supabase.from("conversations").select("id").eq("buyer_id", user.id).eq("seller_id", targetUserId).is("listing_id", null).maybeSingle();
                // 2. İhtimal: Sen Satıcı, O Alıcı
                const { data: convo2 } = await supabase.from("conversations").select("id").eq("buyer_id", targetUserId).eq("seller_id", user.id).is("listing_id", null).maybeSingle();

                let currentConvoId = convo1?.id || convo2?.id || null;

                // EĞER GERÇEKTEN ODA YOKSA YENİ AÇ (Çiftleme sorununun çözümü)
                if (!currentConvoId) {
                    const { data: newConvo, error: insertError } = await supabase.from("conversations").insert([{ buyer_id: user.id, seller_id: targetUserId }]).select().single();
                    if (newConvo) currentConvoId = newConvo.id;
                    if (insertError) console.error("Oda kurulamadı:", insertError);
                }

                if (currentConvoId) {
                    setConversationId(currentConvoId);

                    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", currentConvoId).order("created_at", { ascending: true });
                    if (msgs) setMessages(msgs);

                    await supabase.from("messages").update({ is_read: true }).eq("conversation_id", currentConvoId).neq("sender_id", user.id).eq("is_read", false);
                }
            } catch (err) {
                console.error("Chat başlatma hatası:", err);
                setErrorMsg("Sohbet odası yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        initChat();
    }, [user, targetUserId]);

    // 2. Canlı Mesajlaşma (Sadece conversationId bulunduktan sonra çalışır)
    useEffect(() => {
        if (!conversationId || !user) return;

        const channel = supabase
            .channel(`dm_${conversationId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                    if (payload.new.sender_id !== user.id) {
                        supabase.from("messages").update({ is_read: true }).eq("id", payload.new.id).then();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 3. Mesaj Gönderme (Ekrana düşmeme sorununun çözümü)
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversationId || !user) return;

        const msgText = newMessage;
        setNewMessage(""); // Gönderiye basar basmaz kutuyu temizle

        const { error } = await supabase.from("messages").insert([
            { conversation_id: conversationId, sender_id: user.id, content: msgText, is_read: false },
        ]);

        if (error) {
            console.error("Gönderim hatası:", error);
            setNewMessage(msgText); // Hata olursa mesajı kutuya geri koy
        }
    };

    if (!user) return <div className="p-10 text-center">Yükleniyor...</div>;
    if (errorMsg) return (
        <div className="p-10 text-center flex flex-col items-center">
            <p className="text-red-500 font-bold mb-4">{errorMsg}</p>
            <button onClick={() => router.push('/messages')} className="px-4 py-2 bg-green-600 text-white rounded-lg">Mesajlara Dön</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="font-bold text-lg">{loading ? "Bağlanıyor..." : targetUser ? targetUser.full_name : "Kullanıcı"}</h2>
                        <p className="text-sm text-gray-500">{targetUser ? targetUser.company_name : "Direkt Mesaj"}</p>
                    </div>
                    <button onClick={() => router.back()} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Geri Dön</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {messages.length === 0 && !loading && (
                        <div className="text-center text-gray-500 mt-10">Henüz mesaj yok. İlk mesajı siz gönderin.</div>
                    )}
                    {messages.map((msg) => {
                        const isMine = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine ? "bg-green-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"}`}>
                                    <p>{msg.content}</p>
                                    <span className={`text-[10px] block mt-1 ${isMine ? "text-green-200" : "text-gray-400"}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Bir mesaj yazın..."
                            disabled={loading || !conversationId}
                            className="flex-1 border-2 border-gray-200 rounded-full px-6 py-3 focus:outline-none focus:border-green-600 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || !conversationId || loading}
                            className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-5 h-5 ml-1 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}