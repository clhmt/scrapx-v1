"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function MessagesInboxPage() {
    const { user } = useAuth() as any;
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInbox = useCallback(async () => {
        if (!user) return;
        try {
            const { data: convos } = await supabase
                .from("conversations")
                .select("*")
                .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

            if (!convos) {
                setConversations([]);
                return;
            }

            const inboxData = await Promise.all(
                convos.map(async (c) => {
                    const otherId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
                    const { data: oUser } = await supabase.from("users").select("full_name").eq("id", otherId).single();

                    const { data: lastMsg } = await supabase
                        .from("messages")
                        .select("*")
                        .eq("conversation_id", c.id)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    return {
                        ...c,
                        otherUser: oUser || { full_name: "Kullanıcı" },
                        otherUserId: otherId,
                        lastMessage: lastMsg || null,
                    };
                })
            );

            const sorted = inboxData
                .filter(c => c.lastMessage)
                .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

            setConversations(sorted);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Sayfaya her geri dönüldüğünde önbelleği ez ve veritabanından taze veriyi çek
    useEffect(() => {
        fetchInbox();

        const handleFocus = () => fetchInbox();
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleFocus);

        const channel = supabase
            .channel("inbox_realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
                fetchInbox();
            })
            .subscribe();

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleFocus);
            supabase.removeChannel(channel);
        };
    }, [fetchInbox]);

    if (!user) return <div className="p-10 text-center font-bold">Yükleniyor...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-black mb-6 uppercase tracking-tighter">Gelen Kutusu</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-500">Mesajlar yükleniyor...</div>
                ) : conversations.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">Henüz mesajınız yok.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map((c) => {
                            const msg = c.lastMessage;
                            const isUnread = msg && msg.is_read === false && msg.sender_id !== user.id;

                            return (
                                <Link key={c.id} href={`/messages/direct/${c.otherUserId}`} className="block hover:bg-gray-50 transition-colors p-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 pr-4">
                                            <h3 className={`text-lg ${isUnread ? 'font-black text-black' : 'font-semibold text-gray-800'}`}>
                                                {c.otherUser.full_name}
                                            </h3>
                                            <p className={`text-sm mt-1 truncate ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                {msg.content}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`text-xs ${isUnread ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isUnread && (
                                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                                            )}
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