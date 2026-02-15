"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DirectMessagePage({ params }: { params: { userId: string } }) {
    const { user } = useAuth() as any;
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [targetUser, setTargetUser] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;

        const initChat = async () => {
            // 1. Karşıdaki kullanıcının bilgilerini çek
            const { data: tUser } = await supabase
                .from("users")
                .select("full_name, company_name")
                .eq("id", params.userId)
                .single();
            if (tUser) setTargetUser(tUser);

            // 2. İkiniz arasında daha önce açılmış direkt mesaj (listing_id null olan) var mı kontrol et
            const { data: existingConvos } = await supabase
                .from("conversations")
                .select("*")
                .is("listing_id", null)
                .or(`and(buyer_id.eq.${user.id},seller_id.eq.${params.userId}),and(buyer_id.eq.${params.userId},seller_id.eq.${user.id})`);

            let currentConvoId = null;

            if (existingConvos && existingConvos.length > 0) {
                currentConvoId = existingConvos[0].id;
            } else {
                // Yoksa sıfırdan yeni bir oda kur
                const { data: newConvo } = await supabase
                    .from("conversations")
                    .insert([{ buyer_id: user.id, seller_id: params.userId }])
                    .select()
                    .single();

                if (newConvo) currentConvoId = newConvo.id;
            }

            if (currentConvoId) {
                setConversationId(currentConvoId);

                // Mesajları getir
                const { data: msgs } = await supabase
                    .from("messages")
                    .select("*")
                    .eq("conversation_id", currentConvoId)
                    .order("created_at", { ascending: true });

                if (msgs) setMessages(msgs);

                // Odaya girince karşıdan gelen mesajları "Okundu" olarak işaretle
                await supabase
                    .from("messages")
                    .update({ is_read: true })
                    .eq("conversation_id", currentConvoId)
                    .neq("sender_id", user.id)
                    .eq("is_read", false);
            }
        };

        initChat();

        // Canlı Mesajlaşma (Real-time) aboneliği
        const channel = supabase
            .channel("dm_messages")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages" },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                    // Mesaj bize geldiyse anında okundu yap ki bildirim zili sönsün
                    if (payload.new.sender_id !== user.id) {
                        supabase.from("messages").update({ is_read: true }).eq("id", payload.new.id).then();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, params.userId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversationId || !user) return;

        const { error } = await supabase.from("messages").insert([
            {
                conversation_id: conversationId,
                sender_id: user.id,
                content: newMessage,
                is_read: false
            },
        ]);

        if (!error) setNewMessage("");
    };

    if (!user) return <div className="p-10 text-center">Yükleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
                {/* Sohbet Başlığı */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="font-bold text-lg">{targetUser ? targetUser.full_name : "Bağlanıyor..."}</h2>
                        <p className="text-sm text-gray-500">{targetUser ? targetUser.company_name : "Direkt Mesaj"}</p>
                    </div>
                    <button onClick={() => router.back()} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Geri Dön
                    </button>
                </div>

                {/* Mesaj Kutuları */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
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

                {/* Mesaj Gönderme Çubuğu */}
                <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
                    <form onSubmit={sendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Bir mesaj yazın..."
                            className="flex-1 border-2 border-gray-200 rounded-full px-6 py-3 focus:outline-none focus:border-green-600 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || !conversationId}
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