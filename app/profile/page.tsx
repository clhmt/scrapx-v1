"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Fiyat Biçimlendirme Fonksiyonu
const formatPrice = (price: number) => {
    if (!price) return "0 USD";
    return new Intl.NumberFormat('en-US').format(price) + " USD";
};

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth() as any;
    const router = useRouter();
    const [myListings, setMyListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        } else if (user) {
            fetchMyListings();
        }
    }, [user, authLoading]);

    const fetchMyListings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("listings")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (!error) setMyListings(data || []);
        setLoading(false);
    };

    if (authLoading || loading) return <div className="p-20 text-center font-black">LOADING PROFILE...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* ESKİ DÜZEN: İSİM SOYİSİM VE PROFİL İKONU */}
            <div className="bg-white border-b py-10">
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm">
                        {/* Baş harfi dinamik alıyoruz */}
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div>
                        {/* İstediğin gibi isim soyisim yapısı (Veritabanında isim alanı yoksa e-posta ismiyle başlar) */}
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hamit Öcal</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Verified Member</span>
                            <span className="text-gray-400 text-sm">• {user?.email}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tighter">My Active Listings</h2>
                    <Link href="/listings/create" className="bg-black text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-gray-800 transition shadow-lg">
                        + POST NEW LISTING
                    </Link>
                </div>

                {myListings.length === 0 ? (
                    <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center">
                        <p className="text-gray-400 font-bold italic">You haven't posted any listings yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myListings.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                                <div className="h-40 bg-gray-100 relative">
                                    {item.images?.[0] ? (
                                        <img src={item.images[0]} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 italic font-black text-xs uppercase">No Photo</div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded shadow-sm text-gray-600 uppercase">
                                            {item.status || 'Active'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                                    {/* BİNLİK AYRAÇLI FİYAT */}
                                    <p className="text-lg font-bold text-green-600 mb-4">{formatPrice(item.price)}</p>

                                    <div className="mt-auto pt-4 border-t flex gap-2">
                                        <Link
                                            href={`/listings/edit/${item.id}`}
                                            className="flex-1 bg-gray-100 text-center py-2.5 rounded-xl font-bold text-[11px] text-gray-700 hover:bg-gray-200 transition"
                                        >
                                            EDIT POST
                                        </Link>
                                        <Link
                                            href={`/listings/${item.id}`}
                                            className="px-4 bg-white border border-gray-200 flex items-center justify-center rounded-xl hover:bg-gray-50 transition text-gray-400"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}