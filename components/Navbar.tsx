"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Navbar() {
    // Vercel'deki derleme hatasını (loading property) bypass etmek için 'as any' eklendi
    const { user, loading } = useAuth() as any;
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
        window.location.reload();
    };

    // Menü dışına tıklandığında dropdown'ı kapat
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <nav className="bg-white border-b sticky top-0 z-50 shadow-sm h-16">
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

                {/* LOGO */}
                <div className="flex-shrink-0 mr-8">
                    <Link href="/" className="text-2xl font-black text-gray-900 tracking-tighter">
                        Scrap<span className="text-green-600">X</span>
                    </Link>
                </div>

                {/* SEARCH BAR */}
                <div className="hidden md:flex flex-1 max-w-md mr-auto">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search for scraps..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-colors"
                        />
                        <div className="absolute left-3 top-2.5 text-gray-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                </div>

                {/* RIGHT NAVIGATION */}
                <div className="flex items-center space-x-6">

                    {/* SELL */}
                    <Link href="/listings/create" className="flex flex-col items-center group text-gray-500 hover:text-green-600 transition-colors">
                        <div className="bg-gray-100 p-2 rounded-full group-hover:bg-green-50 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-bold mt-1 uppercase">Sell</span>
                    </Link>

                    {/* WANTED */}
                    <Link href="/wanted" className="flex flex-col items-center group text-gray-500 hover:text-green-600 transition-colors">
                        <div className="bg-gray-100 p-2 rounded-full group-hover:bg-green-50 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <span className="text-[10px] font-bold mt-1 uppercase">Wanted</span>
                    </Link>

                    <div className="h-8 w-px bg-gray-200 mx-2"></div>

                    {/* USER PROFILE */}
                    {!loading && (
                        user ? (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center space-x-2 focus:outline-none group"
                                >
                                    <div className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold overflow-hidden border-2 border-transparent group-hover:border-green-500 transition-all">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                            <p className="text-sm font-bold text-gray-900 truncate">My Account</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        </div>

                                        <div className="py-1">
                                            <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3">
                                                <span className="bg-gray-100 p-1 rounded-md text-gray-600 text-xs">👤</span> My Profile
                                            </Link>
                                            <Link href="/profile?view=listings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3">
                                                <span className="bg-gray-100 p-1 rounded-md text-gray-600 text-xs">📦</span> My Listings
                                            </Link>
                                            <Link href="/profile?view=saved" className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-3">
                                                <span className="bg-gray-100 p-1 rounded-md text-gray-600 text-xs">❤️</span> Saved Offers
                                            </Link>
                                        </div>

                                        <div className="border-t border-gray-100 py-1">
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                            >
                                                <span className="bg-red-50 p-1 rounded-md text-red-500 text-xs">🚪</span> Log Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/auth">
                                <button className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold hover:bg-green-600 transition shadow-sm text-sm">
                                    Log In / Sign Up
                                </button>
                            </Link>
                        )
                    )}
                </div>
            </div>
        </nav>
    );
}