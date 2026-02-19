"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchViewerPremiumState } from "@/lib/sellerProfile";
import { getMaskedDisplayName } from "@/lib/privacy";

type FollowerProfile = {
    id: string;
    full_name: string | null;
    company_name: string | null;
    avatar_url: string | null;
    business_type: string | null;
    country: string | null;
    city: string | null;
};

type FollowerRow = {
    id: string;
    created_at: string;
    follower: FollowerProfile | null;
};
type FollowerRow = {
  id: string;
  created_at: string;
  follower: FollowerProfile | null;
};

type RawFollowerRow = Omit<FollowerRow, "follower"> & {
  follower?: FollowerProfile | FollowerProfile[] | null;
};


export default function FollowersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [followers, setFollowers] = useState<FollowerRow[]>([]);
    const [isPremiumViewer, setIsPremiumViewer] = useState(false);

    useEffect(() => {
        fetchFollowers();
    }, []);

    const fetchFollowers = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const premiumState = await fetchViewerPremiumState(user.id);
        setIsPremiumViewer(premiumState);

        // Fetch followers and join with profiles table to get their details
        // assuming 'follower_id' in followers table links to 'id' in profiles
        const { data, error } = await supabase
            .from("followers")
            .select(`
                id,
                created_at,
                follower:profiles!follower_id (
                    id,
                    full_name,
                    company_name,
                    avatar_url,
                    business_type,
                    country,
                    city
                )
            `)
            .eq("following_id", user.id);

        if (error) {
            console.error("Error fetching followers:", error);
        } else {
            const normalized: FollowerRow[] = (data ?? []).map((row: RawFollowerRow) => ({
                ...row,
                follower: Array.isArray(row.follower) ? (row.follower[0] ?? null) : (row.follower ?? null),
            }));

            setFollowers(normalized);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-8">

                {/* HEADLINE */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 font-bold text-xl">
                        ← Back
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">My Followers ({followers.length})</h1>
                </div>

                {/* CONTENT */}
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading followers...</div>
                ) : followers.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-5xl mb-4">👥</div>
                        <h3 className="text-xl font-bold text-gray-900">No followers yet</h3>
                        <p className="text-gray-500 mt-2">When other traders follow you, they'll appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {followers.map((item) => {
                            const profile = item.follower; // Access the joined profile data
                            if (!profile) return null;

                            const displayName = getMaskedDisplayName(isPremiumViewer, profile.full_name);

                            return (
                                <div key={item.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition">
                                    {/* AVATAR */}
                                    <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                                        )}
                                    </div>

                                    {/* INFO */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{displayName}</h3>
                                        <p className="text-sm text-green-700 font-medium truncate">{isPremiumViewer ? (profile.company_name || "ScrapX Member") : "ScrapX Member"}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {profile.business_type} • {profile.city && profile.country ? `${profile.city}, ${profile.country}` : "Global"}
                                        </p>
                                    </div>

                                    {/* ACTION */}
                                    <Link href={`/profile/${profile.id}`}>
                                        <button className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg font-bold hover:bg-gray-700 transition">
                                            Visit
                                        </button>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
