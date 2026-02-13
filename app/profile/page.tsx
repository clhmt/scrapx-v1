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

    const initialTab = searchParams.get('view') || 'listings';
    const [activeTab, setActiveTab] = useState(initialTab);

    const [myListings, setMyListings] = useState<any[]>([]);
    const [savedListings, setSavedListings] = useState<any[]>([]); // YENİ: Kaydedilen ilanlar state'i

    // YENİ: Takipçi state'leri
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        } else if (user) {
            fetchData();
            fetchFollowData(); // YENİ: Takip verilerini çek
        }
    }, [user, authLoading, activeTab]);

    // YENİ: Takipçi ve Takip Edilen sayılarını getiren fonksiyon
    const fetchFollowData = async () => {
        try {
            const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
            const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
            setFollowersCount(followers || 0);
            setFollowingCount(following || 0);
        } catch (error) {
            console.error("Follows error:", error);
        }
    };

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
        // YENİ: Saved tab'ına tıklandığında kaydedilen ilanları getir
        else if (activeTab === 'saved') {
            try {
                // Önce kullanıcının kaydettiği ilan ID'lerini bul (saved_listings tablosundan)
                const { data: savedData } = await supabase.from("saved_listings").select("listing_id").eq("user_id", user.id);

                if (savedData && savedData.length > 0) {
                    const listingIds = savedData.map(s => s.listing_id);
                    // O ID'lere sahip ilanları çek
                    const { data: listingsData } = await supabase.from("listings").select("*").in("id", listingIds).order("created_at", { ascending: false });
                    setSavedListings(listingsData || []);
                } else {
                    setSavedListings([]);
                }
            } catch (error) {
                console.error("Saved listings error:", error);
            }
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this listing?")) {
            await supabase.from("listings").delete().eq("id", id);
            fetchData();
        }
    };

    if (authLoading || loading) return <div className="p-20 text-center font-black">LOADING PROFILE...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* KİŞİSEL BİLGİLER */}
            <div className="bg-white border-b py-10">
                <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Hamit Öcal</h1>
                        <div className="flex items-center gap-2 mt-1 mb-2">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Verified Member</span>
                            <span className="text-gray-400 text-sm">• {user?.email}</span>
                        </div>
                        {/* YENİ: Takipçi / Takip Edilen Bölümü */}
                        <div className="flex gap-4 text-sm font-bold text-gray-700">
                            <span>{followersCount} <span className="text-gray-400 font-normal">Followers</span></span>
                            <span>{followingCount} <span className="text-gray-400 font-normal">Following</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* SEKME MENÜSÜ */}
                <div className="flex border-b mb-8 gap-8">
                    <button onClick={() => setActiveTab('listings')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'listings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>My Listings</button>
                    <button onClick={() => setActiveTab('wanted')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'wanted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>My Wanted Requests</button>
                    <button onClick={() => setActiveTab('saved')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'saved' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Saved Offers</button>
                </div>

                {/* TAB: MY LISTINGS (Hiçbir şeyi değişmedi) */}
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
                                                <Link href={`/listings/edit/${item.id}`} className="flex-1 bg-gray-100 text-center py-2.5 rounded-lg font-bold text-xs text-gray-700 hover:bg-gray-200 transition">
                                                    Edit Post
                                                </Link>
                                                <button onClick={() => handleDelete(item.id)} className="flex-1 bg-red-50 text-center py-2.5 rounded-lg font-bold text-xs text-red-600 hover:bg-red-100 transition">
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

                {/* YENİ TAB: SAVED OFFERS */}
                {activeTab === 'saved' && (
                    <>
                        {savedListings.length === 0 ? (
                            <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center">
                                <p className="text-gray-400 font-bold italic">You haven't saved any offers yet. Click the heart icon on listings to save them.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedListings.map((item) => (
                                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                                        <div className="h-48 bg-gray-100 relative">
                                            {item.images?.[0] ? (
                                                <img src={item.images[0]} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-xs uppercase">No Photo</div>
                                            )}
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                                            <p className="text-xl font-black text-green-600 mb-4">{formatPrice(item.price)}</p>

                                            <div className="mt-auto flex gap-2 border-t pt-4">
                                                <Link href={`/listings/${item.id}`} className="w-full bg-green-600 text-white text-center py-2.5 rounded-lg font-bold text-xs hover:bg-green-700 transition">
                                                    View Offer
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}