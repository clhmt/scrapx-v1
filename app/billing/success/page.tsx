"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

export default function BillingSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const refreshEntitlementState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        router.refresh();
      }
    };

    void refreshEntitlementState();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Payment successful</h1>
        <p className="text-xl text-gray-600 mb-10">Your premium subscription is being activated.</p>
        <Link
          href="/profile?billing=success"
          className="inline-block bg-green-600 text-white py-3 px-8 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg transition"
        >
          Go to profile
        </Link>
      </div>
    </div>
  );
}
