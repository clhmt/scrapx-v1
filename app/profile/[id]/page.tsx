"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchPrivateContactIfAllowed,
  fetchPublicSellerProfile,
  fetchViewerPremiumState,
  getSellerDisplayNameForViewer,
} from "@/lib/sellerProfile";

type ListingItem = {
  id: string;
  title: string;
  material_type?: string;
  city?: string;
  country?: string;
  price?: number;
  currency?: string;
};

type PublicProfile = {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  created_at?: string | null;
};

export default function PublicSellerProfilePage() {
  const params = useParams();
  const sellerId = String(params.id);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [contact, setContact] = useState<{ email?: string; phone?: string } | null>(null);
  const [isPremiumViewer, setIsPremiumViewer] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [profileData, premiumState] = await Promise.all([
        fetchPublicSellerProfile(sellerId),
        fetchViewerPremiumState(user?.id),
      ]);

      setProfile(profileData);
      setIsPremiumViewer(premiumState);

      const { data: activeListings } = await supabase
        .from("listings")
        .select("id,title,material_type,city,country,price,currency")
        .eq("user_id", sellerId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setListings(activeListings || []);

      const contactData = await fetchPrivateContactIfAllowed(sellerId);
      setContact(contactData);

      setLoading(false);
    };

    load();
  }, [sellerId, user?.id]);

  const displayName = useMemo(() => getSellerDisplayNameForViewer(profile, isPremiumViewer), [isPremiumViewer, profile]);
  const initials = displayName?.[0]?.toUpperCase() || "S";
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "-";

  if (loading) {
    return <div className="p-20 text-center font-bold">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-2xl">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900">{displayName}</h1>
                <p className="text-sm text-gray-500 font-bold">{isPremiumViewer ? profile?.company_name || "ScrapX Member" : "ScrapX Member"}</p>
                <p className="text-xs text-gray-400 font-bold mt-1">Member since {memberSince}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-black text-gray-900 mb-4">Active Listings</h2>

            {listings.length === 0 ? (
              <p className="text-sm text-gray-400 font-bold">No active listings.</p>
            ) : (
              <div className="space-y-3">
                {listings.map((item) => (
                  <Link
                    key={item.id}
                    href={`/listings/${item.id}`}
                    className="block border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-black text-gray-900">{item.title}</h3>
                        <p className="text-xs font-bold text-gray-500 mt-1">
                          {item.material_type || "Material"} • {item.city || "City"}, {item.country || "Country"}
                        </p>
                      </div>
                      <p className="font-black text-green-600 text-sm">
                        {(item.currency || "USD")} {item.price || 0}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit">
          <h2 className="text-lg font-black text-gray-900 mb-4">Contact</h2>

          {isPremiumViewer ? (
            <div className="space-y-3 text-sm font-bold text-gray-700">
              <p>Email: {contact?.email || "-"}</p>
              <p>Phone: {contact?.phone || "-"}</p>
            </div>
          ) : (
            <div>
              <div className="space-y-3 mb-4">
                <p className="text-sm font-bold text-gray-400 blur-[3px] select-none">Email: seller@scrapx.com</p>
                <p className="text-sm font-bold text-gray-400 blur-[3px] select-none">Phone: +1 555 000 000</p>
              </div>
              <Link href="/pricing" className="text-xs font-bold text-emerald-700 hover:underline">
                Upgrade to Premium to view contact details.
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
