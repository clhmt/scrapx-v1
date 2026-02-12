"use client";

import { useEffect, useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialView = searchParams.get("view") || "listings";

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(initialView);

    const [myListings, setMyListings] = useState<any[]>([]);
    const [myWanted, setMyWanted] = useState<any[]>([]);
    const [savedListings, setSavedListings] = useState<any[]>([]);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    useEffect(() => { setActiveTab(initialView); }, [initialView]);
    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(profileData);

        // Stats
        const { count: fCount } = await supabase.from("followers").select("*", { count: 'exact', head: true }).eq("following_id", user.id);
        setFollowersCount(fCount || 0);
        const { count: fingCount } = await supabase.from("followers").select("*", { count: 'exact', head: true }).eq("follower_id", user.id);
        setFollowingCount(fingCount || 0);

        // Listings & Wanted
        const { data: myList } = await supabase.from("listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        setMyListings(myList || []);
        const { data: myW } = await supabase.from("wanted_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        setMyWanted(myW || []);

        // Saved Listings (Join)
        const { data: savedList } = await supabase.from("saved_listings").select(`*, listing:listings (*)`).eq("user_id", user.id);
        // Listing verisini düzleştirelim
        const formattedSaved = savedList?.map((item: any) => item.listing).filter(Boolean) || [];
        setSavedListings(formattedSaved);

        setLoading(false);
    };

    const handleTabChange = (tab: string) => { setActiveTab(tab); router.push(`/profile?view=${tab}`); };

    const deleteItem = async (table: string, id: string) => {
        if (!confirm("Are you sure?")) return;
        await supabase.from(table).delete().eq("id", id);
        fetchData();
    };

    if (loading) return <div className="p-20 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-8">

                {/* HEADER */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-32 h-32 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-100 flex-shrink-0">
                        {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-4xl">👤</div>}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900">{profile?.full_name || "User"}</h1>
                        <p className="text-gray-600">{profile?.company_name} • {profile?.city}, {profile?.country}</p>
                        <div className="flex gap-6 mt-4 justify-center md:justify-start text-sm">
                            <Link href="/profile/followers" className="hover:underline font-bold"><b>{followersCount}</b> Followers</Link>
                            <span><b>{followingCount}</b> Following</span>
                        </div>
                    </div>
                    <Link href="/profile/edit"><button className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold">Edit Profile</button></Link>
                </div>

                {/* TABS */}
                <div className="flex gap-6 border-b border-gray-300 mb-8 overflow-x-auto">
                    {['listings', 'wanted', 'saved'].map((tab) => (
                        <button key={tab} onClick={() => handleTabChange(tab)} className={`pb-4 text-lg font-bold capitalize whitespace-nowrap ${activeTab === tab ? 'text-green-600 border-b-4 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab === 'listings' ? 'My Listings' : tab === 'wanted' ? 'My Wanted Requests' : 'Saved Offers'}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* MY LISTINGS */}
                    {activeTab === 'listings' && myListings.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition">
                            <div className="h-48 bg-gray-100 relative">
                                {item.images && item.images.length > 0 ? (<img src={item.images[0]} className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>)}
                                <span className="absolute top-2 right-2 bg-white px-2 py-1 text-xs font-bold rounded shadow">{item.material_type}</span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold truncate text-lg">{item.title}</h3>
                                <p className="text-green-700 font-bold mb-4 text-xl">${item.price}</p>
                                <button onClick={() => deleteItem('listings', item.id)} className="w-full bg-red-50 text-red-600 py-2 rounded font-bold text-sm hover:bg-red-100">Delete</button>
                            </div>
                        </div>
                    ))}

                    {/* MY WANTED */}
                    {activeTab === 'wanted' && myWanted.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border p-6 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">{item.material_type}</span>
                            <h3 className="font-bold text-lg mt-2">{item.title}</h3>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                            <button onClick={() => deleteItem('wanted_posts', item.id)} className="w-full bg-gray-100 text-gray-600 py-2 rounded font-bold text-sm hover:bg-red-50 hover:text-red-600">Delete Request</button>
                        </div>
                    ))}

                    {/* SAVED OFFERS (RESİM DÜZELTİLDİ) */}
                    {activeTab === 'saved' && savedListings.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition">
                            <div className="h-48 bg-gray-100 relative">
                                {/* Resim Kontrolü - Düzleştirilmiş veriden */}
                                {item.images && item.images.length > 0 ? (
                                    <img src={item.images[0]} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                )}
                                <span className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">SAVED</span>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold truncate text-lg">{item.title}</h3>
                                <p className="text-green-700 font-bold mb-4">${item.price}</p>
                                <Link href={`/listings/${item.id}`}><button className="w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700">View Offer</button></Link>
                            </div>
                        </div>
                    ))}

                    {/* EMPTY STATES */}
                    {activeTab === 'listings' && myListings.length === 0 && <p className="col-span-3 text-center py-10 text-gray-500">No active listings.</p>}
                    {activeTab === 'wanted' && myWanted.length === 0 && <p className="col-span-3 text-center py-10 text-gray-500">No wanted requests.</p>}
                    {activeTab === 'saved' && savedListings.length === 0 && <p className="col-span-3 text-center py-10 text-gray-500">No saved offers.</p>}
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}