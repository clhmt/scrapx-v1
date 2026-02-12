"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function ListingDetail() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const id = params.id as string;

    const [listing, setListing] = useState<any>(null);
    const [seller, setSeller] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Interaction State
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        fetchListingDetails();
    }, [user]);

    const fetchListingDetails = async () => {
        // 1. Fetch Listing
        const { data: listingData, error } = await supabase
            .from("listings")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !listingData) {
            alert("Listing not found");
            router.push("/");
            return;
        }

        setListing(listingData);

        // 2. Fetch Seller Profile
        const { data: sellerData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", listingData.user_id)
            .single();

        setSeller(sellerData);

        // 3. Check Interactions (if user logged in)
        if (user) {
            // Check if saved
            const { data: savedData } = await supabase
                .from("saved_listings")
                .select("id")
                .eq("user_id", user.id)
                .eq("listing_id", id)
                .single();
            setIsSaved(!!savedData);

            // Check if following seller
            const { data: followData } = await supabase
                .from("followers")
                .select("id")
                .eq("follower_id", user.id)
                .eq("following_id", listingData.user_id)
                .single();
            setIsFollowing(!!followData);
        }

        setLoading(false);
    };

    const handleToggleSave = async () => {
        if (!user) { router.push("/auth"); return; }

        if (isSaved) {
            await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", id);
            setIsSaved(false);
        } else {
            await supabase.from("saved_listings").insert([{ user_id: user.id, listing_id: id }]);
            setIsSaved(true);
        }
    };

    const handleToggleFollow = async () => {
        if (!user) { router.push("/auth"); return; }

        if (isFollowing) {
            await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", seller.id);
            setIsFollowing(false);
        } else {
            await supabase.from("followers").insert([{ follower_id: user.id, following_id: seller.id }]);
            setIsFollowing(true);
        }
    };

    const handlePremiumAction = async (action: 'chat' | 'profile') => {
        if (!user) {
            router.push("/auth");
            return;
        }

        // STRICT PREMIUM CHECK
        const { data: userProfile } = await supabase
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .single();

        if (!userProfile?.is_premium) {
            router.push("/premium"); // Immediate Redirect
            return;
        }

        if (action === 'chat') {
            router.push(`/messages/${listing.id}`);
        } else {
            router.push(`/profile/${seller.id}`);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading listing...</div>;

    return (
        <div className="min-h-screen bg-white pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* Breadcrumb */}
                <div className="text-sm text-gray-500 mb-6 flex gap-2">
                    <Link href="/" className="hover:text-green-600">Home</Link> /
                    <span className="text-gray-900">{listing.category}</span> /
                    <span className="truncate">{listing.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* LEFT: IMAGE GALLERY */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative h-96 group">
                            {listing.images && listing.images.length > 0 ? (
                                <img
                                    src={listing.images[currentImageIndex]}
                                    className="w-full h-full object-contain"
                                    alt={listing.title}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">No Image Available</div>
                            )}

                            {/* HEART ICON INTEGRATED */}
                            <button
                                onClick={handleToggleSave}
                                className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                            >
                                <svg className={`w-6 h-6 ${isSaved ? 'text-red-500 fill-current' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>

                        {/* Thumbnails */}
                        {listing.images && listing.images.length > 1 && (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                                {listing.images.map((img: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 ${currentImageIndex === idx ? 'border-green-600' : 'border-transparent'}`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: DETAILS & SELLER */}
                    <div className="space-y-8">

                        {/* LISTING INFO */}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>

                            <p className="text-sm text-gray-500 mb-6 flex items-center gap-1">
                                📍 {listing.city}, {listing.country} • <span className="text-gray-400">Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                            </p>

                            <div className="text-4xl font-black text-green-600 mb-2">
                                {listing.currency} {listing.price.toLocaleString()}
                                <span className="text-lg text-gray-500 font-normal ml-1">/ {listing.unit}</span>
                            </div>
                            <p className="text-sm text-gray-500 mb-8">{listing.pricing_terms} • {listing.supply_type}</p>

                            {/* SPEC TABLE */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 space-y-3 mb-8">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Material</span>
                                    <span className="font-bold text-gray-900">{listing.material_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Category</span>
                                    <span className="font-bold text-gray-900">{listing.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Condition</span>
                                    <span className="font-bold text-gray-900">{listing.condition}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Quantity</span>
                                    <span className="font-bold text-gray-900">{listing.quantity} {listing.unit}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Packaging</span>
                                    <span className="font-bold text-gray-900">{listing.packaging_type}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-900 text-xl mb-3">Description</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                        </div>

                        <hr className="border-gray-100" />

                        {/* SELLER CARD */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-xl overflow-hidden shadow-md">
                                    {seller?.avatar_url ? <img src={seller.avatar_url} className="w-full h-full object-cover" /> : seller?.full_name?.[0]?.toUpperCase() || "S"}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-gray-900 text-lg">{seller?.full_name || "Seller"}</h3>
                                        {seller?.is_premium && (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200">PREMIUM</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2 truncate max-w-[180px]">{seller?.company_name || "Private Trader"}</p>

                                    <button
                                        onClick={handleToggleFollow}
                                        className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${isFollowing ? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
                                    >
                                        {isFollowing ? "Following" : "+ Follow"}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button onClick={() => handlePremiumAction('chat')} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center justify-center gap-2">
                                    <span>💬</span> Chat with Seller
                                </button>
                                <button onClick={() => handlePremiumAction('profile')} className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 transition text-sm">
                                    View Full Profile
                                </button>
                            </div>

                            {!user && <p className="text-xs text-center text-gray-400 mt-3">Log in to interact with seller</p>}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
