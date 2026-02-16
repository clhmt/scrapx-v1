"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider"; // YENİ: Kullanıcı giriş kontrolü için eklendi

const formatPrice = (price?: number | null) => {
  if (!price) return "0 USD";
  return new Intl.NumberFormat('en-US').format(price) + " USD";
};

interface MarketplaceItem {
  id: string;
  user_id?: string | null;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  condition?: string | null;
  country?: string | null;
  city?: string | null;
  price?: number | null;
  target_price?: number | null;
  quantity?: number | null;
  unit?: string | null;
  images?: string[] | null;
}

function MarketplaceContent() {
  const { user } = useAuth(); // YENİ: Giriş yapan kullanıcıyı yakala
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search")?.toLowerCase() || "";
  const [viewMode, setViewMode] = useState<'sell' | 'buy'>('sell');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MarketplaceItem[]>([]);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  const categories = [
    "-- PLASTICS --", "PET", "HDPE", "LDPE", "LLDPE", "PP", "PS", "PVC", "ABS", "PC", "Nylon", "Mixed Plastic",
    "-- METALS --", "Copper", "Aluminium", "Brass", "Stainless Steel", "Lead", "Zinc", "Iron & Steel", "E-Scrap"
  ];
  const conditions = ["Scrap", "Regrind", "Repro (Granules)", "Virgin", "Bales", "Rolls", "Loose"];
  const countries = ["Turkey", "USA", "China", "Germany", "India", "UK", "Vietnam", "UAE", "Canada", "Global"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const table = viewMode === 'sell' ? 'listings' : 'wanted_posts';
    const { data } = await supabase.from(table).select("*").eq("status", "active").order("created_at", { ascending: false });
    setItems((data || []) as MarketplaceItem[]);
    setLoading(false);
  }, [viewMode]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
  }, [fetchData]);

  const filteredItems = items.filter(item => {
    const matchesSearch = urlSearch === "" || item.title?.toLowerCase().includes(urlSearch) || item.description?.toLowerCase().includes(urlSearch);
    const matchesCategory = filterCategory === "" || item.category === filterCategory;
    const matchesCondition = filterCondition === "" || item.condition === filterCondition;
    const matchesCountry = filterCountry === "" || item.country === filterCountry;
    return matchesSearch && matchesCategory && matchesCondition && matchesCountry;
  });

  return (
    <div className={`min-h-screen ${user ? 'bg-[#F8F9FA]' : 'bg-white'}`}>
      <Navbar />

      {/* SADECE GİRİŞ YAPMAMIŞ (ZİYARETÇİ) KULLANICILAR İÇİN GÖSTERİLECEK BÖLÜM */}
      {!user && (
        <>
          <div className="relative bg-[#0a2e1c] overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-green-400/30 via-transparent to-transparent"></div>
              <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-500 rounded-full blur-3xl opacity-20"></div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-24 relative z-10 flex flex-col md:flex-row items-center">
              <div className="w-full md:w-3/5 pr-0 md:pr-10">
                <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter mb-6">
                  Global Recycling <br /> <span className="text-green-400">Marketplace</span>
                </h1>
                <p className="text-lg md:text-xl text-green-50 mb-10 max-w-lg font-medium leading-relaxed">
                  Connect and trade directly with verified suppliers & buyers of recyclable plastics and metals worldwide.
                </p>
                <div className="flex gap-4">
                  <Link href="/auth" className="bg-white text-[#0a2e1c] px-8 py-4 rounded-xl font-black hover:bg-green-50 transition shadow-lg">
                    Join ScrapX
                  </Link>
                  <a href="#marketplace" className="bg-transparent border-2 border-green-400 text-green-400 px-8 py-4 rounded-xl font-black hover:bg-green-400 hover:text-[#0a2e1c] transition">
                    Explore Offers
                  </a>
                </div>
              </div>
              <div className="w-full md:w-2/5 mt-16 md:mt-0 relative hidden md:block">
                <div className="grid grid-cols-2 gap-4 transform rotate-3">
                  <img src="https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=500&q=80" className="rounded-2xl shadow-2xl border-4 border-[#0a2e1c] h-64 w-full object-cover" alt="Plastic" />
                  <img src="https://images.unsplash.com/photo-1567789884554-0b844b597180?w=500&q=80" className="rounded-2xl shadow-2xl border-4 border-[#0a2e1c] h-64 w-full object-cover mt-12" alt="Metal" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0f3d26] py-12 border-y border-green-900/50">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-green-800">
              <div><p className="text-3xl md:text-5xl font-black text-white mb-2">12,000+</p><p className="text-green-400 font-bold text-sm uppercase tracking-widest">Registered Businesses</p></div>
              <div><p className="text-3xl md:text-5xl font-black text-white mb-2">85+</p><p className="text-green-400 font-bold text-sm uppercase tracking-widest">Countries</p></div>
              <div><p className="text-3xl md:text-5xl font-black text-white mb-2">2M+</p><p className="text-green-400 font-bold text-sm uppercase tracking-widest">Tons Listed</p></div>
              <div><p className="text-3xl md:text-5xl font-black text-white mb-2">24/7</p><p className="text-green-400 font-bold text-sm uppercase tracking-widest">Real-time Trading</p></div>
            </div>
          </div>

          <div className="py-24 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">How It Works</h2>
                <div className="w-24 h-1 bg-green-500 mx-auto mt-4 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: "1. Create an Account",
                    description: "Sign up in minutes, complete your business profile, and unlock trusted global recycling partners.",
                    icon: "👤",
                  },
                  {
                    title: "2. Post Scrap or Wanted",
                    description: "Publish your available material or share what you need with clear specs, quantity, and target pricing.",
                    icon: "📝",
                  },
                  {
                    title: "3. Connect & Message",
                    description: "Reach suppliers and buyers instantly through direct messages to negotiate terms and delivery details.",
                    icon: "💬",
                  },
                  {
                    title: "4. Trade Safely",
                    description: "Finalize deals confidently with transparent communication and verified business identities.",
                    icon: "🛡️",
                  },
                ].map((step) => (
                  <div key={step.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-green-100 text-2xl flex items-center justify-center mb-4">
                      <span role="img" aria-label={step.title}>{step.icon}</span>
                    </div>
                    <h3 className="font-black text-lg text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* HERKESE GÖZÜKEN VE GİRİŞ YAPINCA İLK AÇILAN ESKİ İLAN (MARKETPLACE) EKRANI */}
      <div id="marketplace" className={`${user ? 'pt-8' : 'pt-20'} pb-20 bg-[#F8F9FA]`}>

        {!user && (
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Live Offers</h2>
            <p className="text-gray-500 mt-2 font-bold">Browse the latest listings on ScrapX</p>
          </div>
        )}

        {/* FİLTRE BARI */}
        <div className={`bg-white border-y sticky top-16 z-40 shadow-sm ${user ? 'mb-8' : 'mb-10'}`}>
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
              <button onClick={() => setViewMode('sell')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'sell' ? 'bg-white text-green-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-800'}`}>FOR SALE</button>
              <button onClick={() => setViewMode('buy')} className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${viewMode === 'buy' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-500 hover:text-gray-800'}`}>WANTED</button>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c} disabled={c.startsWith('--')}>{c}</option>)}
              </select>
              <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)} className="bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer">
                <option value="">Any Condition</option>
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="bg-gray-50 border-none rounded-lg px-4 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer">
                <option value="">Global</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* İLAN KARTLARI (ESKİ SİSTEM) */}
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-20 text-green-600 font-bold">Loading Marketplace...</div>
          ) : (
            <div className={viewMode === 'sell' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" : "max-w-4xl mx-auto space-y-4"}>
              {filteredItems.map((item) => (
                viewMode === 'sell' ? (
                  <Link href={`/listings/${item.id}`} key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                    <div className="h-56 bg-gray-100 relative overflow-hidden">
                      {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black italic">ScrapX</div>}
                      <div className="absolute top-3 left-3"><span className="bg-black/70 backdrop-blur-md text-white px-2 py-1 text-[9px] font-black rounded uppercase">{item.condition || 'Scrap'}</span></div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-lg truncate mb-1">{item.title}</h3>
                      <p className="text-xs text-gray-400 font-bold mb-4">📍 {item.city}, {item.country}</p>
                      <div className="mt-auto pt-4 border-t flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Price</p>
                          <span className="text-xl font-black text-green-600">{formatPrice(item.price)}</span>
                        </div>
                        <span className="text-xs font-black text-gray-900 bg-gray-50 px-2 py-1 rounded">{item.quantity} {item.unit}</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-400 font-bold">📍 Wanted in {item.country} • Target: <span className="text-green-600 font-bold">{formatPrice(item.target_price)}</span></p>
                    </div>
                    {item.user_id ? (
                      <Link href={`/messages/direct/${item.user_id}`} className="w-full md:w-auto bg-blue-600 text-white px-10 py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition text-center">
                        Send Message
                      </Link>
                    ) : (
                      <button disabled className="w-full md:w-auto bg-gray-300 text-gray-500 px-10 py-3 rounded-xl font-black text-sm cursor-not-allowed">
                        User unavailable
                      </button>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SADECE GİRİŞ YAPMAMIŞLARA GÖZÜKECEK KATEGORİ ALANI */}
      {!user && (
        <div className="py-24 bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-4xl font-black text-[#0a2e1c] tracking-tighter uppercase mb-6">Top Categories</h2>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                {['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'Copper', 'Aluminium', 'Steel'].map((cat) => (
                  <div key={cat} className="flex items-center gap-3 group cursor-pointer">
                    <span className="text-green-500 transform group-hover:translate-x-2 transition-transform">▶</span>
                    <span className="font-black text-xl text-gray-700 group-hover:text-green-600 transition-colors">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <img src="https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?w=800&q=80" className="rounded-3xl shadow-2xl w-full h-auto object-cover" alt="Global Trade" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black text-2xl text-green-600 animate-pulse bg-[#0a2e1c]">STARTING SCRAPX...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
