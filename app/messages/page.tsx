"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MessagesInbox() {
    const router = useRouter();
    // HATA BURADAYDI: isLoading yerine loading kullanıyoruz
    const { user, loading: authLoading } = useAuth() as any;
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        } else if (user) {
            fetchConversations();
        }
    }, [user, authLoading]);

    const fetchConversations = async () => {
        // Mesaj kutusu mantığı...
        setLoading(false);
    };

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
                        <p>Conversation List...</p>
                    )}
                </div>
            </div>
        </div>
    );
}