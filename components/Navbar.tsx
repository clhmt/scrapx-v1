"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchCurrentViewerPremiumState } from "@/lib/sellerProfile";

export default function Navbar() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // URL'deki mevcut arama terimini al
    const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Arama kutusu her değiştiğinde URL'yi güncelle
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);

        // Ana sayfadaysak URL'yi sessizce güncelle, değilsek ana sayfaya yönlendir
        if (value.trim() !== "") {
            router.push(`/?search=${encodeURIComponent(value)}`);
        } else {
            router.push(`/`);
        }
    };

    // Logout ve ClickOutside kısımları aynı kalıyor...
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
        window.location.reload();
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!user?.id) {
            setIsPremiumUser(false);
            return;
        }

        const loadPremiumState = async () => {
            const premiumState = await fetchCurrentViewerPremiumState();
            setIsPremiumUser(premiumState);
        };

        loadPremiumState();
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        const fetchUnreadCount = async () => {
            const { data: conversations, error: conversationsError } = await supabase
                .from("conversations")
                .select("id")
                .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

            if (conversationsError) {
                return;
            }

            const conversationIds = (conversations || []).map((conversation) => conversation.id);

            if (conversationIds.length === 0) {
                setUnreadCount(0);
                return;
            }

            const { count, error } = await supabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .in("conversation_id", conversationIds)
                .eq("is_read", false)
                .neq("sender_id", user.id);

            if (!error) {
                setUnreadCount(count || 0);
            }
        };

        fetchUnreadCount();

        const channel = supabase
            .channel(`navbar_unread_messages_${user.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
                fetchUnreadCount();
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    return (
        <nav className="bg-white border-b sticky top-0 z-50 shadow-sm h-16">
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

                {/* LOGO */}
                <div className="flex-shrink-0 mr-8">
                    <Link href="/" className="text-2xl font-black text-gray-900 tracking-tighter">
                        Scrap<span className="text-green-600">X</span>
                    </Link>
                </div>

                {/* SEARCH BAR (ARTIK ÇALIŞIYOR) */}
                <div className="hidden md:flex flex-1 max-w-md mr-auto">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search for scraps (e.g. ship, copper...)"
                            value={searchValue}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-colors"
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Diğer Navigasyon Linkleri ve Profil Bölümü (Aynı Kalıyor) */}
                <div className="flex items-center space-x-6">
                    <Link href="/pricing" className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold hover:bg-green-600 transition text-sm">
                        {isPremiumUser ? "Manage Billing" : "Upgrade to Premium"}
                    </Link>
                    <Link href="/listings/create" className="flex flex-col items-center group text-gray-500 hover:text-green-600">
                        <div className="bg-gray-100 p-2 rounded-full group-hover:bg-green-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                        <span className="text-[10px] font-bold mt-1 uppercase">Sell</span>
                    </Link>
                    <Link href="/wanted" className="flex flex-col items-center group text-gray-500 hover:text-green-600">
                        <div className="bg-gray-100 p-2 rounded-full group-hover:bg-green-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                        <span className="text-[10px] font-bold mt-1 uppercase">Wanted</span>
                    </Link>
                    <div className="h-8 w-px bg-gray-200 mx-2"></div>
                    {!loading && (
                        user ? (
                            <div className="relative" ref={dropdownRef}>
                                <div className="flex items-center gap-3">
                                    <Link href="/messages" className="relative text-gray-700 hover:text-green-600 transition-colors" aria-label="Unread messages">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-2 10H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z" /></svg>
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-2 -right-2 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                                                {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold overflow-hidden border-2 border-transparent hover:border-green-500 transition-all">
                                        {user.email?.[0].toUpperCase()}
                                    </button>
                                </div>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                        <div className="px-4 py-3 border-b bg-gray-50/50"><p className="text-sm font-bold truncate">My Account</p><p className="text-xs text-gray-500 truncate">{user.email}</p></div>
                                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 flex items-center gap-3">👤 My Profile</Link>
                                        <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3">🚪 Log Out</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/auth"><button className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold hover:bg-green-600 transition text-sm">Log In / Sign Up</button></Link>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
}
