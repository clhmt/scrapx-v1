"use client";

import Navbar from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PricingPage() {
    const [loadingCheckout, setLoadingCheckout] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const stripePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    const hasWarnedMissingPriceId = useRef(false);

    useEffect(() => {
        if (!stripePriceId && !hasWarnedMissingPriceId.current) {
            console.warn("Missing NEXT_PUBLIC_STRIPE_PRICE_ID on /pricing checkout.");
            hasWarnedMissingPriceId.current = true;
        }
    }, [stripePriceId]);

    const startCheckout = async () => {
        setLoadingCheckout(true);
        setCheckoutError(null);

        const {
            data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;

        if (!accessToken) {
            setCheckoutError("Please sign in before upgrading.");
            setLoadingCheckout(false);
            return;
        }

        if (!stripePriceId) {
            setCheckoutError("Billing is temporarily unavailable. Please try again later.");
            setLoadingCheckout(false);
            return;
        }

        const response = await fetch("/api/billing/checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ priceId: stripePriceId }),
        });

        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const payload = isJson ? await response.json().catch(() => null) : null;
        const plainText = isJson ? "" : await response.text().catch(() => "");

        if (!response.ok || !payload?.url) {
            setCheckoutError(
                payload?.error || plainText || "Unable to start checkout. Please try again."
            );
            setLoadingCheckout(false);
            return;
        }

        window.location.assign(payload.url);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">

                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Upgrade to Premium 💎</h1>
                <p className="text-xl text-gray-600 mb-12">Unlock full access to suppliers, buyers, and contact details.</p>

                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-green-500 overflow-hidden transform hover:scale-105 transition duration-300">
                    <div className="bg-green-600 p-6 text-white">
                        <h2 className="text-2xl font-bold uppercase tracking-wide">ScrapX Premium</h2>
                        <p className="opacity-90 mt-2">All Features Included</p>
                    </div>

                    <div className="p-8">
                        <div className="text-5xl font-extrabold text-gray-900 mb-2">$19.99</div>
                        <p className="text-gray-500 font-medium mb-8">per month</p>

                        <ul className="text-left space-y-4 mb-8 text-gray-600">
                            <li className="flex items-center gap-3">
                                <span className="text-green-500 text-xl">✓</span> Unlimited Chats with Sellers
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-500 text-xl">✓</span> View Supply Requests (Wanted)
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-500 text-xl">✓</span> See Who Follows You
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-500 text-xl">✓</span> Premium &quot;Verified&quot; Badge
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-500 text-xl">✓</span> Priority Support
                            </li>
                        </ul>

                        <button
                            onClick={startCheckout}
                            disabled={loadingCheckout || !stripePriceId}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg transition"
                        >
                            {loadingCheckout ? "Redirecting..." : "Get Premium Now"}
                        </button>
                        {checkoutError ? <p className="text-xs text-red-500 mt-3">{checkoutError}</p> : null}
                        <p className="text-xs text-gray-400 mt-4">Cancel anytime. Secure payment.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
