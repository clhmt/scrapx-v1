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
  const [items, setItems] = useState<any[]>([]);

  // FILTERS STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  // GENİŞLETİLMİŞ KATEGORİ VE ÜLKE LİSTESİ
  const categories = [
    "-- PLASTICS --", "PET", "HDPE", "LDPE", "LLDPE", "PP", "PS", "PVC", "ABS", "PC", "Nylon", "Mixed Plastic",
    "-- METALS --", "Copper", "Aluminium", "Brass", "Stainless Steel", "Lead", "Zinc", "Iron & Steel", "E-Scrap"
  ];
  const conditions = ["Scrap", "Regrind", "Repro (Granules)", "Virgin", "Bales", "Rolls", "Loose"];
  const countries = [
    "Turkey", "USA", "China", "Germany", "India", "UK", "Vietnam", "UAE",
    "Canada", "Netherlands", "Spain", "Italy", "South Korea", "Japan", "Brazil", "Global"
  ];

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

  const filteredItems = items.filter(item => {
    const matchesCategory = filterCategory === "" || item.category === filterCategory;
    const matchesCondition = filterCondition === "" || item.condition === filterCondition;
    const matchesCountry = filterCountry === "" || item.country === filterCountry;
    return matchesCategory && matchesCondition && matchesCountry;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      <Navbar />

      {/* MODERN FILTER BAR (Scrapo Style) */}
      <div className="bg-white border-b sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">

          {/* TOGGLE SWITCH */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button onClick={() => setViewMode('sell')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'sell' ? 'bg-white text-green-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-800'}`}>
              FOR SALE
            </button>
            <button onClick={() => setViewMode('buy')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'buy' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-800'}`}>
              WANTED
            </button>
          </div>

          {/* DROPDOWN FILTERS */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</span>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="appearance-none bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-green-500 outline-none cursor-pointer hover:bg-gray-100 transition">
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c} disabled={c.startsWith('--')}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condition</span>
              <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} className="appearance-none bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-green-500 outline-none cursor-pointer hover:bg-gray-100 transition">
                <option value="">Any Condition</option>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Country</span>
              <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="appearance-none bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-green-500 outline-none cursor-pointer hover:bg-gray-100 transition">
                <option value="">Global</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {(filterCategory || filterCondition || filterCountry) && (
              <button onClick={() => { setFilterCategory(""); setFilterCondition(""); setFilterCountry(""); }} className="ml-4 p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Clear All">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FEED */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className={viewMode === 'sell' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" : "max-w-4xl mx-auto space-y-4"}>
            {filteredItems.map((item) => (
              viewMode === 'sell' ? (
                <Link href={`/listings/${item.id}`} key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                  <div className="h-56 bg-gray-100 relative overflow-hidden">
                    {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-300">No Photo</div>}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-black/70 backdrop-blur-md text-white px-2 py-1 text-[9px] font-black rounded uppercase">{item.condition || 'Scrap'}</span>
                    </div>
                  </div>
                  <div className="p-5 flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{item.title}</h3>
                    <p className="text-xs text-gray-400 font-bold mb-4 flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                      {item.city}, {item.country}
                    </p>
                    <div className="flex justify-between items-end border-t pt-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Price</p>
                        <span className="text-xl font-black text-green-600">${item.price}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-gray-900 bg-gray-50 px-2 py-1 rounded">{item.quantity} {item.unit}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-3">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{item.category}</span>
                      <span className="bg-gray-50 text-gray-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">{item.condition}</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-400 font-bold">📍 Wanted in {item.country} • Target: <span className="text-green-600">${item.target_price}</span></p>
                  </div>
                  <Link href={`/messages/${item.id}`} className="w-full md:w-auto">
                    <button className="w-full bg-blue-600 text-white px-10 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-100">SEND OFFER</button>
                  </Link>
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
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse">CONNECTING TO GLOBAL MARKET...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}