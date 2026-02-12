"use client";

import { useEffect, useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'sell' | 'buy'>('sell');
  const [loading, setLoading] = useState(true);

  // DATA
  const [items, setItems] = useState<any[]>([]);

  // FILTERS STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  const categories = ["ABS", "HDPE", "LDPE", "PET", "PVC", "PP", "PS", "Copper", "Aluminium", "Brass", "Iron & Steel"];
  const conditions = ["Scrap", "Regrind", "Repro", "Virgin", "Bales", "Rolls"];
  const countries = ["Turkey", "USA", "China", "Germany", "India", "UK", "Vietnam", "UAE"];

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const fetchData = async () => {
    setLoading(true);
    const table = viewMode === 'sell' ? 'listings' : 'wanted_posts';
    const { data } = await supabase.from(table).select("*").eq("status", "active").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  // FILTER LOGIC
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "" || item.category === filterCategory;
    const matchesCondition = filterCondition === "" || item.condition === filterCondition;
    const matchesCountry = filterCountry === "" || item.country === filterCountry;
    return matchesSearch && matchesCategory && matchesCondition && matchesCountry;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      {/* SUB-HEADER & TOGGLE */}
      <div className="bg-white border-b shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button onClick={() => setViewMode('sell')} className={`px-6 py-2 rounded-md font-bold text-sm transition ${viewMode === 'sell' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              📦 For Sale
            </button>
            <button onClick={() => setViewMode('buy')} className={`px-6 py-2 rounded-md font-bold text-sm transition ${viewMode === 'buy' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              📢 Wanted
            </button>
          </div>

          {/* QUICK FILTERS BAR (Scrapo Style) */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Conditions</option>
              {conditions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(filterCategory || filterCondition || filterCountry) && (
              <button onClick={() => { setFilterCategory(""); setFilterCondition(""); setFilterCountry(""); }} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Updating marketplace...</div>
        ) : (
          <div className={viewMode === 'sell' ? "grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6" : "grid grid-cols-1 gap-4"}>
            {filteredItems.map((item) => (
              viewMode === 'sell' ? (
                <Link href={`/listings/${item.id}`} key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition flex flex-col group">
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>}
                    <span className="absolute top-2 right-2 bg-white/90 px-2 py-1 text-[10px] font-black rounded uppercase shadow">{item.condition || 'Scrap'}</span>
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold text-gray-900 truncate">{item.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">📍 {item.city}, {item.country}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-green-700 font-black text-lg">${item.price}</span>
                      <span className="text-[10px] font-bold text-gray-400">{item.quantity} {item.unit}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-md transition">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-1 rounded uppercase">{item.category}</span>
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-1 rounded uppercase">{item.condition}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500">📍 Wanted in: {item.country} • Target: <span className="text-green-600 font-bold">${item.target_price}</span></p>
                  </div>
                  <Link href="/pricing"><button className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md">Message Buyer</button></Link>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Connecting to market...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}