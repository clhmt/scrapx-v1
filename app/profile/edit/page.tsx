"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function EditProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // GLOBAL DATA
    const countryData: any = {
        "USA": ["New York", "Houston", "Los Angeles", "Chicago", "Miami", "New Jersey"],
        "Turkey": ["Istanbul", "Izmir", "Mersin", "Adana", "Bursa", "Gaziantep", "Ankara"],
        "China": ["Shanghai", "Ningbo", "Tianjin", "Guangzhou", "Shenzhen"],
        "Germany": ["Hamburg", "Berlin", "Munich", "Frankfurt"],
        "India": ["Mumbai", "Delhi", "Chennai", "Kolkata"],
        "UK": ["London", "Liverpool", "Manchester"],
        "Global": []
    };

    const [formData, setFormData] = useState({
        full_name: "", company_name: "", business_type: "Recycler",
        city: "", country: "", bio: "", website: "", phone: "",
        email: "", avatar_url: ""
    });

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();

        if (data) {
            setFormData({
                full_name: data.full_name || "",
                company_name: data.company_name || "",
                business_type: data.business_type || "Recycler",
                city: data.city || "",
                country: data.country || "",
                bio: data.bio || "",
                website: data.website || "",
                phone: data.phone || "",
                avatar_url: data.avatar_url || "",
                email: user.email || ""
            });
            if (data.avatar_url) setPreviewUrl(data.avatar_url);
        }
        setLoading(false);
    };

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleCountryChange = (e: any) => {
        setFormData({ ...formData, country: e.target.value, city: "" });
    };

    const handleFileChange = (e: any) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: any) => {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let finalAvatarUrl = formData.avatar_url;

        if (avatarFile) {
            const fileName = `avatars/${user.id}-${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from("listings").upload(fileName, avatarFile);
            if (!uploadError) {
                const { data } = supabase.storage.from("listings").getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }
        }

        const { error } = await supabase.from("profiles").upsert({
            id: user.id,
            full_name: formData.full_name,
            company_name: formData.company_name,
            business_type: formData.business_type,
            city: formData.city,
            country: formData.country,
            bio: formData.bio,
            website: formData.website,
            phone: formData.phone,
            avatar_url: finalAvatarUrl,
            email: formData.email
        });

        if (error) alert("Error saving: " + error.message);
        else { alert("Profile saved successfully!"); router.push("/profile"); }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Profile</h1>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <form onSubmit={handleSave} className="space-y-6">

                        {/* ŞIK FOTOĞRAF ALANI */}
                        <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-3xl text-gray-400">👤</div>
                                )}
                            </div>
                            <div>
                                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition shadow-sm">
                                    📸 Change Photo
                                    <input type="file" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* EMAIL (KİLİTLİ) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address <span className="text-xs text-gray-400 font-normal">(Cannot be changed)</span></label>
                            <input value={formData.email} disabled className="w-full p-3 border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>

                        {/* DİĞER ALANLAR AYNI */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-bold mb-2">Full Name</label><input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-3 border rounded-lg" required /></div>
                            <div><label className="block text-sm font-bold mb-2">Company Name</label><input name="company_name" value={formData.company_name} onChange={handleChange} className="w-full p-3 border rounded-lg" required /></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-2">Country</label>
                                <select name="country" value={formData.country} onChange={handleCountryChange} className="w-full p-3 border rounded-lg bg-white">
                                    <option value="">Select Country</option>
                                    {Object.keys(countryData).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">City</label>
                                <select name="city" value={formData.city} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white">
                                    <option value="">Select City</option>
                                    {countryData[formData.country]?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="block text-sm font-bold mb-2">Phone</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 border rounded-lg" /></div>
                            <div><label className="block text-sm font-bold mb-2">Website</label><input name="website" value={formData.website} onChange={handleChange} className="w-full p-3 border rounded-lg" /></div>
                        </div>

                        <div><label className="block text-sm font-bold mb-2">Business Type</label>
                            <select name="business_type" value={formData.business_type} onChange={handleChange} className="w-full p-3 border rounded-lg">
                                <option>Recycler</option><option>Broker</option><option>Trader</option><option>Logistics</option>
                            </select></div>

                        <button type="submit" disabled={saving} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md">{saving ? "Saving..." : "Save Profile"}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}