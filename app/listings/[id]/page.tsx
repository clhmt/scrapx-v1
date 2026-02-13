"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";

const formatPrice = (price: number) => {
    if (!price) return "0 USD";
    return new Intl.NumberFormat('en-US').format(price) + " USD";
};

export default function ListingDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth() as any;

    const [listing, setListing] = useState<any>(null);
    const [seller, setSeller] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // YENİ: Hafıza State'leri
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id, user]);

    const fetchData = async () => {
        setLoading(true);
        // İlanı Çek
        const { data: listingData } = await supabase.from("listings").select("*").eq("id", id).single();
        if (listingData) {
            setListing(listingData);

            // Satıcı bilgisini çek (şimdilik emailini gösteriyoruz, ileride profil tablosu eklenebilir)
            const { data: sellerData } = await supabase.from("users").select("*").eq("id", listingData.user_id).single();
            setSeller(sellerData || { email: "mehmet@mntpaper.com", full_name: "Mehmet" });

            // Kullanıcı giriş yapmışsa Follow ve Save durumlarını kontrol et
            if (user) {
                const { data: savedData } = await supabase.from("saved_listings").select("*").eq("user_id", user.id).eq("listing_id", id).single();
                if (savedData) setIsSaved(true);

                const { data: followData } = await supabase.from("follows").select("*").eq("follower_id", user.id).eq("following_id", listingData.user_id).single();
                if (followData) setIsFollowing(true);
            }
        }
        setLoading(false);
    };

    // YENİ: Kaydetme (Kalp) Fonksiyonu
    const handleSaveToggle = async () => {
        if (!user) return alert("Please log in to save offers.");

        if (isSaved) {
            await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", id);
            setIsSaved(false);
        } else {
            await supabase.from("saved_listings").insert({ user_id: user.id, listing_id: id });
            setIsSaved(true);
        }
    };

    // YENİ: Takip Etme Fonksiyonu
    const handleFollowToggle = async () => {
        if (!user) return alert("Please log in to follow sellers.");
        if (user.id === listing.user_id) return alert("You cannot follow yourself.");

        if (isFollowing) {
            await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", listing.user_id);
            setIsFollowing(false);
        } else {
            await supabase.from("follows").insert({ follower_id: user.id, following_id: listing.user_id });
            setIsFollowing(true);
        }
    };

    // YENİ: Chat Butonu Fonksiyonu
    const handleChat = () => {
        if (!user) return router.push("/auth");
        // İleride detaylı mesajlaşma ekranına yönlendirecek
        router.push(`/messages/${listing.id}`);
    };

    if (loading) return <div className="p-20 text-center font-bold">Loading...</div>;
    if (!listing) return <div className="p-20 text-center font-bold text-red-500">Listing not found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="text-sm text-gray-500 font-bold mb-6 flex items-center gap-2">
                    Home / {listing.category || 'Category'} / <span className="text-gray-900">{listing.title}</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* SOL: FOTOĞRAF ALANI */}
                    <div className="lg:w-2/3">
                        <div className="bg-gray-200 rounded-3xl h-[500px] relative overflow-hidden flex items-center justify-center border border-gray-100 shadow-sm">
                            {listing.images?.[0] ? (
                                <img src={listing.images[0]} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 font-black text-xl uppercase">No Image Available</span>
                            )}

                            {/* KALP BUTONU (Hafızaya Bağlı) */}
                            <button
                                onClick={handleSaveToggle}
                                className="absolute top-6 right-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                            >
                                {isSaved ? (
                                    <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                )}
                            </button>
                        </div>

                        {/* AÇIKLAMA */}
                        <div className="mt-10">
                            <h2 className="text-xl font-black text-gray-900 mb-4">Description</h2>
                            <p className="text-gray-600 font-medium leading-relaxed bg-white p-6 rounded-2xl border border-gray-100">
                                {listing.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {/* SAĞ: DETAYLAR VE SATICI PROFİLİ */}
                    <div className="lg:w-1/3 space-y-6">
                        {/* FİYAT KARTI */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h1 className="text-3xl font-black text-gray-900 mb-2">{listing.title}</h1>
                            <p className="text-sm text-gray-500 font-bold mb-6 flex items-center gap-1">
                                📍 {listing.city}, {listing.country} • Posted {new Date(listing.created_at).toLocaleDateString()}
                            </p>

                            <div className="text-4xl font-black text-green-600 mb-2">
                                {formatPrice(listing.price)} <span className="text-lg text-gray-400 font-bold">/ {listing.unit}</span>
                            </div>
                            <p className="text-sm font-bold text-gray-500 mb-8">• Ongoing</p>

                            <div className="space-y-4">
                                <div className="flex justify-between border-b pb-3"><span className="text-gray-500 font-bold">Material</span><span className="font-black text-gray-900">{listing.material_type || 'Plastic'}</span></div>
                                <div className="flex justify-between border-b pb-3"><span className="text-gray-500 font-bold">Category</span><span className="font-black text-gray-900">{listing.category}</span></div>
                                <div className="flex justify-between border-b pb-3"><span className="text-gray-500 font-bold">Condition</span><span className="font-black text-gray-900">{listing.condition || 'Scrap'}</span></div>
                                <div className="flex justify-between border-b pb-3"><span className="text-gray-500 font-bold">Quantity</span><span className="font-black text-gray-900">{listing.quantity} {listing.unit}</span></div>
                                <div className="flex justify-between pb-2"><span className="text-gray-500 font-bold">Packaging</span><span className="font-black text-gray-900">{listing.packaging || 'Bales'}</span></div>
                            </div>
                        </div>

                        {/* SATICI (MEHMET) KARTI */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-xl">
                                    {seller?.full_name?.[0]?.toUpperCase() || 'M'}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">{seller?.full_name || 'Mehmet'}</h3>
                                    <p className="text-xs text-gray-500 font-bold mb-2 truncate max-w-[200px]">{seller?.company_name || 'MNT Paper and Plastics...'}</p>

                                    {/* FOLLOW BUTONU (Hafızaya Bağlı) */}
                                    <button
                                        onClick={handleFollowToggle}
                                        className={`px-4 py-1 text-[10px] font-black uppercase rounded border-2 transition-colors ${isFollowing
                                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                                : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        {isFollowing ? 'Following ✓' : '+ Follow'}
                                    </button>
                                </div>
                            </div>

                            <button onClick={handleChat} className="w-full bg-[#52A04A] text-white py-4 rounded-xl font-black text-sm hover:bg-[#43873c] transition shadow-md flex items-center justify-center gap-2 mb-3">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                Chat with Seller
                            </button>
                            <button className="w-full bg-white border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition">
                                View Full Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}