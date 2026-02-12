"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        setNotifications(data || []);
        setLoading(false);
    };

    const markAllRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <button onClick={markAllRead} className="text-sm text-green-600 font-bold hover:underline">Mark all as read</button>
                </div>

                {loading ? <div className="text-center py-10">Loading...</div> : (
                    <div className="space-y-4">
                        {notifications.length === 0 ? <div className="text-center py-10 text-gray-500 bg-white rounded-xl">No notifications yet.</div> :
                            notifications.map((n) => (
                                <Link href={n.link || "#"} key={n.id} className={`block p-4 rounded-xl border transition hover:shadow-md ${n.is_read ? 'bg-white border-gray-200' : 'bg-green-50 border-green-200'}`}>
                                    <div className="flex gap-4">
                                        <div className="text-2xl">{n.type === 'new_listing' ? '📦' : n.type === 'offer' ? '💰' : '🔔'}</div>
                                        <div>
                                            <h3 className={`font-bold ${n.is_read ? 'text-gray-900' : 'text-green-900'}`}>{n.title}</h3>
                                            <p className="text-sm text-gray-600">{n.message}</p>
                                            <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
