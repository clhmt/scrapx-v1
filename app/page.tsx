"use client";

import { useEffect, useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get("search") || "";

  // STATE: 'sell' (Satılıklar) veya 'buy' (Alınıklar/Wanted)
  const [viewMode, setViewMode] = useState<'sell' | 'buy'>('sell');

  const [listings, setListings] = useState<any[]>([]);
  const [wantedPosts, setWantedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

  useEffect(() => { if (urlSearchTerm) setSearchTerm(urlSearchTerm); }, [urlSearchTerm]);

  // Mod değişince veya sayfa açılınca veriyi çek
  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const fetchData = async () => {
    setLoading(true);

    if (viewMode === 'sell') {
      const { data } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
      setListings(data || []);
    } else {
      const { data } = await supabase.from("wanted_posts").select("*").eq("status", "active").order("created_at", { ascending: false });
      setWantedPosts(data || []);
    }

    setLoading(false);
  };

  // --- FİLTRELEME MANTIĞI ---
  const filteredListings = listings.filter(item => {
    if (!searchTerm) return true;
    return item.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredWanted = wantedPosts.filter(item => {
    if (!searchTerm) return true;
    return item.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* TOGGLE SWITCH (BÜYÜK SEÇİM BUTONLARI) */}
        <div className="flex justify-center mb-10">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
            <button
              onClick={() => setViewMode('sell')}
              className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${viewMode === 'sell' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              📦 Materials For Sale
            </button>
            <button
              onClick={() => setViewMode('buy')}
              className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${viewMode === 'buy' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              📢 Wanted Requests
            </button>
          </div>
        </div>

        {/* BAŞLIK VE ARAMA */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'sell' ? 'Marketplace Feed' : 'Buyer Requests'}
          </h1>
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-3 border rounded-lg w-full md:w-1/3"
          />
        </div>

        {loading ? (<div className="text-center py-20 text-gray-500">Loading market data...</div>) : (
          <>
            {/* --- SATILIKLAR (FOR SALE) LİSTESİ --- */}
            {viewMode === 'sell' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.length === 0 ? <p className="text-center col-span-3 text-gray-500">No listings found.</p> : filteredListings.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition flex flex-col">
                    <div className="h-48 bg-gray-100 relative">
                      {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                      )}
                      <span className="absolute top-2 right-2 bg-white px-2 py-1 text-xs font-bold rounded shadow">{item.material_type}</span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg truncate">{item.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">📍 {item.city}, {item.country}</p>
                      <div className="mt-auto flex justify-between items-end">
                        <span className="text-green-700 font-bold text-xl">${item.price}</span>
                        <Link href={`/listings/${item.id}`}><button className="text-green-600 font-bold text-sm hover:underline">View Details</button></Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- ALINIKLAR (WANTED) LİSTESİ --- */}
            {viewMode === 'buy' && (
              <div className="grid grid-cols-1 gap-4">
                {filteredWanted.length === 0 ? <p className="text-center col-span-1 text-gray-500">No wanted requests found.</p> : filteredWanted.map((post) => (
                  <div key={post.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-md transition">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase">{post.material_type}</span>
                        {post.condition && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded uppercase">{post.condition}</span>}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{post.title}</h3>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-1">{post.description}</p>
                      <div className="text-sm font-medium text-gray-700">
                        📦 {post.quantity} {post.unit} • 📍 {post.country} • <span className="text-green-600 font-bold">Target: ${post.target_price || 'Negotiable'}</span>
                      </div>
                    </div>
                    <Link href="/pricing">
                      <button className="bg-white border-2 border-green-600 text-green-700 px-6 py-2 rounded-lg font-bold hover:bg-green-600 hover:text-white transition whitespace-nowrap">
                        Message Buyer
                      </button>
                    </Link>
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

export default function Home() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}