"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function PricingPage() {
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
                                <span className="text-green-500 text-xl">✓</span> Premium "Verified" Badge
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-500 text-xl">✓</span> Priority Support
                            </li>
                        </ul>

                        <button
                            onClick={() => alert("Payment Gateway Integration Coming Soon!")}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg transition"
                        >
                            Get Premium Now
                        </button>
                        <p className="text-xs text-gray-400 mt-4">Cancel anytime. Secure payment.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}