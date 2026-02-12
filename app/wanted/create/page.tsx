"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CreateWanted() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // DATA
    const categories: any = { "Plastic": ["ABS", "HDPE", "LDPE", "PET", "PVC", "PP", "PS"], "Metal": ["Copper", "Aluminium", "Brass", "Iron"] };

    // GLOBAL COUNTRY LIST (Tam Liste)
    const countryData: any = {
        "USA": ["New York", "Houston", "Los Angeles", "Chicago", "Miami", "Savannah"],
        "Turkey": ["Istanbul", "Izmir", "Mersin", "Adana", "Bursa", "Gaziantep", "Ankara"],
        "China": ["Shanghai", "Ningbo", "Tianjin", "Guangzhou", "Shenzhen", "Hong Kong"],
        "Germany": ["Hamburg", "Berlin", "Munich", "Frankfurt"],
        "India": ["Mumbai", "Delhi", "Chennai", "Kolkata"],
        "Vietnam": ["Ho Chi Minh City", "Haiphong"],
        "UK": ["London", "Felixstowe", "Liverpool"],
        "UAE": ["Dubai", "Abu Dhabi"],
        "Canada": ["Toronto", "Montreal", "Vancouver"],
        "Netherlands": ["Rotterdam", "Amsterdam"],
        "Spain": ["Valencia", "Barcelona"],
        "Italy": ["Genoa", "Naples"],
        "South Korea": ["Busan", "Incheon"],
        "Japan": ["Tokyo", "Yokohama"],
        "Brazil": ["Santos", "Paranagua"],
        "Global": [] // Global seçeneği
    };

    const [formData, setFormData] = useState({
        title: "", material_type: "Plastic", category: "", condition: "Scrap",
        quantity: "", unit: "Tons", target_price: "", country: "Global", city: "", description: ""
    });

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleCountryChange = (e: any) => setFormData({ ...formData, country: e.target.value, city: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const { error } = await supabase.from("wanted_posts").insert({
            user_id: user.id, ...formData, quantity: parseFloat(formData.quantity) || 0, target_price: parseFloat(formData.target_price) || 0, status: "active"
        });

        if (error) alert("Error: " + error.message); else { alert("Request Posted!"); router.push("/wanted"); }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 py-10">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                    <div className="w-full md:w-1/3 bg-blue-50 p-10 flex flex-col justify-center items-center text-center border-r border-blue-100">
                        <div className="text-6xl mb-4">🔍</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Post a Request</h2>
                        <p className="text-gray-600">Tell sellers exactly what you need.</p>
                    </div>
                    <div className="w-full md:w-2/3 p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div><label className="block text-sm font-bold mb-2">Title</label><input name="title" onChange={handleChange} className="w-full p-3 border rounded-lg" required /></div>

                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-sm font-bold mb-2">Category</label><select name="category" onChange={handleChange} className="w-full p-3 border rounded-lg"><option>Select</option>{categories["Plastic"].map((c: string) => <option key={c}>{c}</option>)}</select></div>
                                <div><label className="block text-sm font-bold mb-2">Quantity</label><input name="quantity" onChange={handleChange} className="w-full p-3 border rounded-lg" /></div>
                            </div>

                            {/* GLOBAL COUNTRY SELECTION */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Country Origin</label>
                                    <select name="country" value={formData.country} onChange={handleCountryChange} className="w-full p-3 border rounded-lg bg-white">
                                        <option value="Global">Global (All Countries)</option>
                                        {Object.keys(countryData).filter(c => c !== "Global").sort().map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">City</label>
                                    {countryData[formData.country]?.length > 0 ? (
                                        <select name="city" onChange={handleChange} className="w-full p-3 border rounded-lg"><option value="">Any City</option>{countryData[formData.country].map((c: string) => <option key={c}>{c}</option>)}</select>
                                    ) : (
                                        <input name="city" placeholder="City name" onChange={handleChange} className="w-full p-3 border rounded-lg" />
                                    )}
                                </div>
                            </div>

                            <div><label className="block text-sm font-bold mb-2">Target Price</label><input name="target_price" onChange={handleChange} className="w-full p-3 border rounded-lg" /></div>
                            <div><label className="block text-sm font-bold mb-2">Description</label><textarea name="description" rows={3} onChange={handleChange} className="w-full p-3 border rounded-lg" /></div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => router.back()} className="w-1/3 py-3 border rounded-lg font-bold">Cancel</button>
                                <button type="submit" disabled={loading} className="w-2/3 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">{loading ? "Saving..." : "Post Request"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}