"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import {
    fetchPremiumOfferCount,
    fetchPublicSellerProfile,
    fetchViewerPremiumState,
    getSellerDisplayNameForViewer,
} from "@/lib/sellerProfile";

const formatPrice = (price: number) => {
    if (!price) return "0 USD";
    return new Intl.NumberFormat('en-US').format(price) + " USD";
};

type ListingData = {
    id: string;
    user_id: string;
    title: string;
    category?: string;
    city?: string;
    country?: string;
    created_at: string;
    price: number;
    unit?: string;
    material_type?: string;
    condition?: string;
    quantity?: number;
    packaging?: string;
    description?: string;
    images?: string[];
};

type SellerData = {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
};

export default function ListingDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [listing, setListing] = useState<ListingData | null>(null);
    const [seller, setSeller] = useState<SellerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerTonnage, setOfferTonnage] = useState("");
    const [offerPricePerTon, setOfferPricePerTon] = useState("");
    const [submittingOffer, setSubmittingOffer] = useState(false);
    const [premiumOfferCount, setPremiumOfferCount] = useState<number | null>(null);
    const [isPremiumViewer, setIsPremiumViewer] = useState(false);

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

            const sellerProfile = await fetchPublicSellerProfile(listingData.user_id);
            setSeller(sellerProfile);

            const premiumState = await fetchViewerPremiumState(user?.id);
            setIsPremiumViewer(premiumState);

            const offerCount = await fetchPremiumOfferCount(listingData.id);
            setPremiumOfferCount(offerCount);

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
        if (!listing) return;
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
        if (!listing) return;
        // İleride detaylı mesajlaşma ekranına yönlendirecek
        router.push(`/messages/${listing.id}`);
    };

    const handleOfferSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!user) {
            router.push("/auth");
            return;
        }

        if (!listing?.id || !listing?.user_id) {
            alert("Listing data is unavailable. Please refresh and try again.");
            return;
        }

        if (user.id === listing.user_id) {
            alert("You cannot make an offer on your own listing.");
            return;
        }

        const tonnage = Number(offerTonnage);
        const pricePerTon = Number(offerPricePerTon);

        if (!Number.isFinite(tonnage) || tonnage <= 0) {
            alert("Tonnage must be greater than 0.");
            return;
        }

        if (!Number.isFinite(pricePerTon) || pricePerTon <= 0) {
            alert("Price per ton must be greater than 0.");
            return;
        }

        setSubmittingOffer(true);

        try {
            const { data: offer, error: offerError } = await supabase
                .from("offers")
                .insert([
                    {
                        listing_id: listing.id,
                        buyer_id: user.id,
                        tonnage,
                        price_per_ton: pricePerTon,
                        currency: "USD",
                    },
                ])
                .select("id")
                .single();

            if (offerError || !offer?.id) {
                alert("Failed to create the offer. Please try again.");
                return;
            }

            let convId: string | null = null;
            const { data: existingConv } = await supabase
                .from("conversations")
                .select("id")
                .eq("listing_id", listing.id)
                .eq("buyer_id", user.id)
                .maybeSingle();

            convId = existingConv?.id ?? null;

            if (!convId) {
                const { data: createdConversation, error: createConversationError } = await supabase
                    .from("conversations")
                    .insert([{ listing_id: listing.id, buyer_id: user.id, seller_id: listing.user_id }])
                    .select("id")
                    .single();

                if (createConversationError || !createdConversation?.id) {
                    alert("Offer was created but conversation setup failed.");
                    return;
                }

                convId = createdConversation.id;
            }

            const { error: messageError } = await supabase.from("messages").insert([
                {
                    conversation_id: convId,
                    sender_id: user.id,
                    content: "Offer sent",
                    is_read: false,
                    offer_id: offer.id,
                },
            ]);

            if (messageError) {
                alert("Offer created but message delivery failed.");
                return;
            }

            setShowOfferModal(false);
            setOfferTonnage("");
            setOfferPricePerTon("");

            router.push(`/messages/direct/${listing.user_id}?convo=${convId}`);
        } finally {
            setSubmittingOffer(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold">Loading...</div>;
    if (!listing) return <div className="p-20 text-center font-bold text-red-500">Listing not found.</div>;

    const sellerDisplayName = getSellerDisplayNameForViewer(seller, isPremiumViewer);
    const sellerCompanyName = isPremiumViewer ? seller?.company_name || "ScrapX Member" : "ScrapX Member";

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

                            {premiumOfferCount !== null ? (
                                <p className="text-xs font-bold text-emerald-700 mt-6">This listing has {premiumOfferCount} offers.</p>
                            ) : (
                                <p className="text-xs font-bold text-gray-400 mt-6">Premium insight</p>
                            )}
                        </div>

                        {/* SATICI (MEHMET) KARTI */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-xl">
                                    {sellerDisplayName?.[0]?.toUpperCase() || 'S'}
                                </div>
                                <div>
                                    <Link href={`/profile/${listing.user_id}`} className="font-black text-gray-900 text-lg hover:underline">
                                        {sellerDisplayName}
                                    </Link>
                                    <p className="text-xs text-gray-500 font-bold mb-2 truncate max-w-[200px]">{sellerCompanyName}</p>

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
                            <button
                                onClick={() => {
                                    if (!user) {
                                        router.push("/auth");
                                        return;
                                    }
                                    setShowOfferModal(true);
                                }}
                                className="w-full bg-white border-2 border-green-600 text-green-600 py-3 rounded-xl font-black text-sm hover:bg-green-50 transition mb-3"
                            >
                                Make an Offer
                            </button>
                            <Link href={`/profile/${listing.user_id}`} className="w-full block text-center bg-white border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-black text-sm hover:bg-gray-50 transition">
                                View Full Profile
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {showOfferModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
                        <h2 className="text-xl font-black text-gray-900 mb-4">Make an Offer</h2>

                        <form onSubmit={handleOfferSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tonnage</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={offerTonnage}
                                    onChange={(event) => setOfferTonnage(event.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-600"
                                    placeholder="Enter tonnage"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Price per Ton (USD)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={offerPricePerTon}
                                    onChange={(event) => setOfferPricePerTon(event.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-green-600"
                                    placeholder="Enter price per ton"
                                    required
                                />
                            </div>

                            <div className="text-sm font-bold text-gray-600">Currency: USD</div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowOfferModal(false)}
                                    className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-black text-gray-600 hover:bg-gray-50"
                                    disabled={submittingOffer}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-[#52A04A] text-white rounded-xl font-black hover:bg-[#43873c] disabled:opacity-50"
                                    disabled={submittingOffer}
                                >
                                    {submittingOffer ? "Submitting..." : "Send Offer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
