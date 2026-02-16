"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface MessageRow {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

interface TargetUser {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email?: string | null;
}

export default function DirectMessagePage({ params }: { params: { userId: string } }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<MessageRow[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [targetUser, setTargetUser] = useState<TargetUser | null>(null);
    const [initializing, setInitializing] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/auth");
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const initChat = async () => {
            setInitializing(true);
            setConversationId(null);

            try {
                const { data: tUser, error: targetError } = await supabase
                    .from("users")
                    .select("id, full_name, company_name, email")
                    .eq("id", params.userId)
                    .maybeSingle();

                if (targetError) {
                    console.error("Target user fetch error:", targetError);
                }

                if (isMounted) {
                    setTargetUser((tUser as TargetUser) || { id: params.userId, full_name: null, company_name: null, email: null });
                }

                const { data: existingConvo, error: convoError } = await supabase
                    .from("conversations")
                    .select("id")
                    .is("listing_id", null)
                    .or(`and(buyer_id.eq.${user.id},seller_id.eq.${params.userId}),and(buyer_id.eq.${params.userId},seller_id.eq.${user.id})`)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (convoError) {
                    throw convoError;
                }

                let resolvedConversationId = existingConvo?.id ?? null;

                if (!resolvedConversationId) {
                    const { data: insertedConvo, error: insertError } = await supabase
                        .from("conversations")
                        .insert([{ buyer_id: user.id, seller_id: params.userId, listing_id: null }])
                        .select("id")
                        .single();

                    if (insertError) {
                        throw insertError;
                    }

                    resolvedConversationId = insertedConvo.id;
                }

                if (!resolvedConversationId) {
                    throw new Error("Conversation ID could not be resolved.");
                }

                if (isMounted) {
                    setConversationId(resolvedConversationId);
                }

                const { data: msgs, error: messagesError } = await supabase
                    .from("messages")
                    .select("id, conversation_id, sender_id, content, created_at, is_read")
                    .eq("conversation_id", resolvedConversationId)
                    .order("created_at", { ascending: true });

                if (messagesError) {
                    throw messagesError;
                }

                if (isMounted) {
                    setMessages((msgs || []) as MessageRow[]);
                }

                await supabase
                    .from("messages")
                    .update({ is_read: true })
                    .eq("conversation_id", resolvedConversationId)
                    .neq("sender_id", user.id)
                    .eq("is_read", false);
            } catch (error) {
                console.error("Direct chat init error:", error);
            } finally {
                if (isMounted) {
                    setInitializing(false);
                }
            }
        };

        initChat();

        return () => {
            isMounted = false;
        };
    }, [user, params.userId]);

    useEffect(() => {
        if (!conversationId || !user) return;

        const channel = supabase
            .channel(`dm_messages_${conversationId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    const message = payload.new as MessageRow;
                    setMessages((prev) => [...prev, message]);

                    if (message.sender_id !== user.id) {
                        supabase.from("messages").update({ is_read: true }).eq("id", message.id).then();
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

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !conversationId || !user) return;

        const { error } = await supabase.from("messages").insert([
            {
                conversation_id: conversationId,
                sender_id: user.id,
                content: newMessage,
                is_read: false,
            },
        ]);

        if (!error) setNewMessage("");
    };

    if (authLoading || !user) return <div className="p-10 text-center">Yükleniyor...</div>;

    const headerName = targetUser?.full_name?.trim() || targetUser?.email?.split("@")[0] || "ScrapX User";
    const headerCompany = targetUser?.company_name?.trim() || "Direkt Mesaj";

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="font-bold text-lg">{headerName}</h2>
                        <p className="text-sm text-gray-500">{headerCompany}</p>
                    </div>
                    <button onClick={() => router.back()} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Geri Dön
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {initializing ? (
                        <div className="text-center text-gray-400 font-semibold">Bağlanıyor...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-400 font-semibold">Henüz mesaj yok. İlk mesajı siz gönderin.</div>
                    ) : (
                        messages.map((msg) => {
                            const isMine = msg.sender_id === user.id;
                            return (
                                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMine ? "bg-green-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"}`}>
                                        <p>{msg.content}</p>
                                        <span className={`text-[10px] block mt-1 ${isMine ? "text-green-200" : "text-gray-400"}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

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
