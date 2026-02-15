"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
  const [myWantedPosts, setMyWantedPosts] = useState<any[]>([]);
  const [savedListings, setSavedListings] = useState<any[]>([]);
  const [followedUsers, setFollowedUsers] = useState<any[]>([]);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    } else if (user) {
      fetchData();
      fetchFollowData();
    }
  }, [user, authLoading, activeTab]);

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
      const { data } = await supabase.from("listings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setMyListings(data || []);
    }
    else if (activeTab === 'wanted') {
      const { data } = await supabase.from("wanted_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setMyWantedPosts(data || []);
    }
    else if (activeTab === 'saved') {
      try {
        const { data: savedData } = await supabase.from("saved_listings").select("listing_id").eq("user_id", user.id);
        if (savedData && savedData.length > 0) {
          const listingIds = savedData.map(s => s.listing_id);
          const { data: listingsData } = await supabase.from("listings").select("*").in("id", listingIds).order("created_at", { ascending: false });
          setSavedListings(listingsData || []);
        } else {
          setSavedListings([]);
        }
      } catch (error) {
        console.error("Saved listings error:", error);
      }
    }
    else if (activeTab === 'following') {
      try {
        const { data: followData } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        if (followData && followData.length > 0) {
          const ids = followData.map(f => f.following_id);
          const { data: usersData } = await supabase.from("users").select("*").in("id", ids);
          if (usersData && usersData.length > 0) {
            setFollowedUsers(usersData);
          } else {
            // DÜZELTME: Eski orijinal "Mehmet" tasarımına geri dönüldü
            setFollowedUsers(ids.map(id => ({ id, full_name: "Mehmet", company_name: "MNT Paper and Plastics" })));
          }
        } else {
          setFollowedUsers([]);
        }
      } catch (error) {
        console.error("Following error:", error);
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, table: string) => {
    const itemType = table === 'listings' ? 'listing' : 'wanted request';
    if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
      await supabase.from(table).delete().eq("id", id);
      fetchData();
    }
  };

  if (authLoading || loading) return <div className="p-20 text-center font-black">LOADING PROFILE...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="bg-white border-b py-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm">
            {userName[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{userName}</h1>
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Verified Member</span>
              <span className="text-gray-400 text-sm">• {user?.email}</span>
            </div>
            <div className="flex gap-4 text-sm font-bold text-gray-700">
              <span className="cursor-pointer hover:text-green-600 transition" onClick={() => setActiveTab('followers')}>
                {followersCount} <span className="text-gray-400 font-normal hover:underline">Followers</span>
              </span>
              <span className="cursor-pointer hover:text-green-600 transition" onClick={() => setActiveTab('following')}>
                {followingCount} <span className="text-gray-400 font-normal hover:underline">Following</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex border-b mb-8 gap-8 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setActiveTab('listings')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'listings' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>My Listings</button>
          <button onClick={() => setActiveTab('wanted')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'wanted' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>My Wanted Requests</button>
          <button onClick={() => setActiveTab('saved')} className={`pb-3 font-bold text-sm transition-colors ${activeTab === 'saved' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Saved Offers</button>
        </div>

        {activeTab === 'listings' && (
          <>
            <div className="flex justify-end mb-6">
              <Link href="/listings/create" className="bg-black text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-gray-800 transition shadow-lg">+ POST NEW LISTING</Link>
            </div>
            {myListings.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center"><p className="text-gray-400 font-bold italic">You haven't posted any listings yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myListings.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="h-48 bg-gray-100 relative">
                      {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-xs uppercase">No Photo</div>}
                      <div className="absolute top-3 right-3"><span className="bg-white/90 backdrop-blur text-[10px] font-bold px-3 py-1 rounded shadow-sm text-gray-800 uppercase">{item.material_type || 'Metal'}</span></div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                      <p className="text-xl font-black text-green-600 mb-4">{formatPrice(item.price)}</p>
                      <div className="mt-auto flex gap-2 border-t pt-4">
                        <Link href={`/listings/edit/${item.id}`} className="flex-1 bg-gray-100 text-center py-2.5 rounded-lg font-bold text-xs text-gray-700 hover:bg-gray-200 transition">Edit</Link>
                        <button onClick={() => handleDelete(item.id, 'listings')} className="flex-1 bg-red-50 text-center py-2.5 rounded-lg font-bold text-xs text-red-600 hover:bg-red-100 transition">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'wanted' && (
          <>
            <div className="flex justify-end mb-6">
              <Link href="/wanted/create" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow-lg">+ POST WANTED REQUEST</Link>
            </div>
            {myWantedPosts.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center"><p className="text-gray-400 font-bold italic">You haven't posted any wanted requests yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myWantedPosts.map((item) => (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-sm transition-all border-l-4 border-l-blue-500">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-3">
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{item.category}</span>
                        <span className="bg-gray-50 text-gray-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{item.condition}</span>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-400 font-bold">📍 Wanted in {item.country} • Target: <span className="text-green-600">${formatPrice(item.target_price)}</span></p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                      <Link href={`/wanted/edit/${item.id}`} className="flex-1 md:flex-none bg-gray-100 text-center px-8 py-3 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-200 transition">Edit</Link>
                      <button onClick={() => handleDelete(item.id, 'wanted_posts')} className="flex-1 md:flex-none bg-red-50 text-center px-8 py-3 rounded-xl font-bold text-xs text-red-600 hover:bg-red-100 transition">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && (
          <>
            {savedListings.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center"><p className="text-gray-400 font-bold italic">You haven't saved any offers yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {savedListings.map((item) => (
                  <Link href={`/listings/${item.id}`} key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                    <div className="h-56 bg-gray-100 relative overflow-hidden">
                      {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black italic">ScrapX</div>}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-lg truncate mb-1">{item.title}</h3>
                      <p className="text-xl font-black text-green-600 mb-4">{formatPrice(item.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* FOLLOWING */}
        {activeTab === 'following' && (
          <>
            {followedUsers.length === 0 ? (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center"><p className="text-gray-400 font-bold italic">You are not following anyone yet.</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {followedUsers.map((u) => (
                  <div key={u.id} className="bg-white p-8 rounded-3xl border border-gray-200 flex flex-col items-center text-center shadow-sm hover:shadow-md transition">
                    <div className="w-20 h-20 bg-gray-900 rounded-full text-white flex items-center justify-center text-2xl font-black mb-4">
                      {u.full_name?.[0]?.toUpperCase() || 'M'}
                    </div>
                    <h3 className="font-black text-xl text-gray-900 mb-1">{u.full_name || 'Mehmet'}</h3>
                    <p className="text-sm text-gray-500 font-bold mb-6">{u.company_name || 'MNT Paper and Plastics'}</p>

                    <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-black w-full shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      Message (Premium)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* FOLLOWERS */}
        {activeTab === 'followers' && (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center"><p className="text-gray-400 font-bold italic">Users following you will appear here.</p></div>
        )}
      </div>
    </div>
  );
}
