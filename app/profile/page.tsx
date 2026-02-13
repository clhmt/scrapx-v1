"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Fiyat Biçimlendirme
const formatPrice = (price: number) => {
    if (!price) return "0 USD";
    return new Intl.NumberFormat('en-US').format(price) + " USD";
};

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth() as any;
    const router = useRouter();
    const searchParams = useSearchParams();

    // Sekme (Tab) Yönetimi - Eski düzeni geri getirdik
    const initialTab = searchParams.get('view') || 'listings';
    const [activeTab, setActiveTab] = useState(initialTab);

    const [myListings, setMyListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        } else if (user) {
            fetchData();
        }
    }, [user, authLoading, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'listings') {
            const { data } = await supabase
                .from("listings")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });
            setMyListings(data || []);
        }
        // Wanted ve Saved dataları ileride buraya eklenecek
        setLoading(false);
    };

    // İlan Silme Fonksiyonu (Eski tasarımdaki Delete butonu için)
    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this listing?")) {
            await supabase.from("listings").delete().eq("id", id);
            fetchData(); // Listeyi yenile
        }
    };

    if (authLoading || loading) return <div className="p-20 text-center font-black">LOADING PROFILE...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* KİŞİSEL BİLGİLER (İsim Soyisim) */}
            <div className="bg-white border-b py-10">
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hamit Öcal</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Verified Member</span>
                            <span className="text-gray-400 text-sm">• {user?.email}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* SEKME MENÜSÜ (KAYBOLAN ESKİ DÜZEN GERİ GELDİ) */}
                <div className="flex border-b mb-8 gap-8">
                    <button onClick={() => setActiveTab('listings')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'listings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>My Listings</button>
                    <button onClick={() => setActiveTab('wanted')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'wanted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>My Wanted Requests</button>
                    <button onClick={() => setActiveTab('saved')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'saved' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Saved Offers</button>
                </div>

                {/* TAB: MY LISTINGS */}
                {activeTab === 'listings' && (
                    <>
                        <div className="flex justify-end mb-6">
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
                                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                                        <div className="h-48 bg-gray-100 relative">
                                            {item.images?.[0] ? (
                                                <img src={item.images[0]} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-xs uppercase">No Photo</div>
                                            )}
                                            <div className="absolute top-3 right-3">
                                                <span className="bg-white/90 backdrop-blur text-[10px] font-bold px-3 py-1 rounded shadow-sm text-gray-800 uppercase">
                                                    {item.material_type || 'Metal'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col">
                                            <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                                            <p className="text-xl font-black text-green-600 mb-4">{formatPrice(item.price)}</p>

                                            <div className="mt-auto flex gap-2 border-t pt-4">
                                                <Link
                                                    href={`/listings/edit/${item.id}`}
                                                    className="flex-1 bg-gray-100 text-center py-2.5 rounded-lg font-bold text-xs text-gray-700 hover:bg-gray-200 transition"
                                                >
                                                    Edit Post
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="flex-1 bg-red-50 text-center py-2.5 rounded-lg font-bold text-xs text-red-600 hover:bg-red-100 transition"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* TAB: MY WANTED REQUESTS */}
                {activeTab === 'wanted' && (
                    <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center">
                        <p className="text-gray-400 font-bold italic">Wanted requests will appear here.</p>
                    </div>
                )}

                {/* TAB: SAVED OFFERS */}
                {activeTab === 'saved' && (
                    <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center">
                        <p className="text-gray-400 font-bold italic">Your saved offers will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}