"use client";

import Navbar from "@/components/Navbar";

export default function PremiumPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                        Upgrade to <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Premium</span>
                    </h1>
                    <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
                        Unlock exclusive features and grow your business faster with ScrapX Premium.
                    </p>
                </div>

                <div className="max-w-lg mx-auto rounded-lg shadow-lg overflow-hidden lg:max-w-none lg:flex">
                    <div className="flex-1 bg-white px-6 py-8 lg:p-12">
                        <h3 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                            Membership Benefits
                        </h3>
                        <p className="mt-6 text-base text-gray-500">
                            Get full access to the global marketplace and advanced trading tools.
                        </p>
                        <div className="mt-8">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg leading-6 font-medium text-gray-900">Priority Listings</h4>
                                    <p className="mt-2 text-base text-gray-500">Your materials appear at the top of search results.</p>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8H8l-4 4V5a2 2 0 012-2h12a2 2 0 012 2z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg leading-6 font-medium text-gray-900">Direct Messaging</h4>
                                    <p className="mt-2 text-base text-gray-500">Unlimited messages to connect with buyers and sellers.</p>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center">
                                <div className="flex-shrink-0 h-12 w-12 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h4 className="text-lg leading-6 font-medium text-gray-900">Market Insights</h4>
                                    <p className="mt-2 text-base text-gray-500">Access to real-time pricing data and trends.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="py-8 px-6 text-center bg-gray-50 lg:flex-shrink-0 lg:flex lg:flex-col lg:justify-center lg:p-12">
                        <p className="text-lg leading-6 font-medium text-gray-900">
                            Only
                        </p>
                        <div className="mt-4 flex items-center justify-center text-5xl font-extrabold text-gray-900">
                            <span>$19.99</span>
                            <span className="ml-3 text-xl font-medium text-gray-500">
                                /mo
                            </span>
                        </div>
                        <div className="mt-6">
                            <div className="rounded-md shadow">
                                <a
                                    href="#"
                                    className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
                                >
                                    Start Your Trial
                                </a>
                            </div>
                        </div>
                        <div className="mt-4 text-sm">
                            <a href="#" className="font-medium text-gray-900 hover:text-gray-500">
                                Get a yearly plan for <span className="font-bold">$199</span>
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
