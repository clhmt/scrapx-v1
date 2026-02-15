"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ListingCard from "@/components/ListingCard";
import { supabase } from "@/lib/supabaseClient";

interface Listing {
  id: string;
  title: string;
  price: number;
  currency: string;
  material_type: string;
  city: string;
  country: string;
  images: string[];
  quantity?: number;
  unit?: string;
}

export default function MarketplacePage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const searchTerm = useMemo(() => (searchParams.get("search") || "").trim(), [searchParams]);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);

      let query = supabase
        .from("listings")
        .select("id,title,price,currency,material_type,city,country,images,quantity,unit")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,material_type.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch marketplace listings:", error);
        setListings([]);
      } else {
        setListings((data || []) as Listing[]);
      }

      setLoading(false);
    };

    fetchListings();
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Marketplace</h1>
          <p className="text-gray-500 mt-1">
            {searchTerm ? `Showing results for "${searchTerm}"` : "Browse the latest scrap listings from all users."}
          </p>
        </div>

        {loading ? (
          <div className="p-20 text-center font-bold">Loading marketplace...</div>
        ) : listings.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center">
            <p className="text-gray-400 font-bold italic">No listings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
