"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

function AuthContent() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);

    // Form Stateleri
    const [fullName, setFullName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState(""); // YENİ: Telefon numarası
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // 1. Kullanıcıyı oluştur
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            company_name: companyName,
                            phone: phone
                        }
                    }
                });

                if (signUpError) throw signUpError;

                // 2. Herkesin görebileceği 'users' (Açık Profil) tablosuna bilgileri kaydet
                if (authData.user) {
                    const { error: profileError } = await supabase.from('users').insert({
                        id: authData.user.id,
                        full_name: fullName,
                        company_name: companyName,
                        phone: phone,
                        email: email
                    });

                    if (profileError) {
                        console.error("Profile creation error:", profileError);
                    }
                }

                alert("Sign up successful! You can now sign in.");
                setIsSignUp(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            {isSignUp ? "Create an account" : "Sign in to your account"}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Or{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                }}
                                className="font-bold text-green-600 hover:text-green-500 transition-colors"
                            >
                                {isSignUp ? "sign in to existing account" : "create a new account"}
                            </button>
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                        <div className="rounded-md shadow-sm space-y-4">

                            {/* Kayıt Olurken İstenecek Ekstra Alanlar */}
                            {isSignUp && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="e.g. John Doe" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Company Name</label>
                                        <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="e.g. ScrapX Recycling LLC" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="+1 (555) 000-0000" />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email address</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="name@company.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 sm:text-sm" placeholder="••••••••" />
                            </div>
                        </div>

                        {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</div>}

                        <div>
                            <button type="submit" disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white ${isSignUp ? "bg-black hover:bg-gray-800" : "bg-green-600 hover:bg-green-700"} transition-all shadow-md ${loading ? "opacity-70 cursor-not-allowed" : ""}`}>
                                {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold">Connecting...</div>}>
            <AuthContent />
        </Suspense>
    );
}