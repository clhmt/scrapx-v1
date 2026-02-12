"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CreateListing() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // --- DETAYLI VERİ SETİ (Geri Getirildi) ---
    const categories: any = {
        "Plastic": ["ABS", "HDPE", "LDPE", "PET", "PVC", "PP", "PS", "Polycarbonate", "Nylon", "Mixed Plastic"],
        "Metal": ["Copper", "Aluminium", "Brass", "Stainless Steel", "Lead", "Zinc", "Iron & Steel", "E-Scrap"]
    };

    const packagingOptions = ["Bales", "Rolls", "Pallets", "Octabins", "Big Bags", "Loose", "Briocquettes"];

    const productCodes = [
        "391510 - Polymers of Ethylene", "391520 - Polymers of Styrene", "391530 - Vinyl Chloride", "391590 - Other Plastics",
        "740400 - Copper Waste", "760200 - Aluminium Waste", "7204 - Ferrous Waste"
    ];

    // GLOBAL ÜLKE & ŞEHİR (Korundu)
    const countryData: any = {
        "USA": ["New York", "Houston", "Los Angeles", "Chicago", "Miami", "Savannah", "Seattle", "New Jersey"],
        "Turkey": ["Istanbul", "Izmir", "Mersin", "Adana", "Bursa", "Gaziantep", "Ankara", "Aliaga"],
        "China": ["Shanghai", "Ningbo", "Tianjin", "Guangzhou", "Shenzhen", "Qingdao", "Hong Kong"],
        "Germany": ["Hamburg", "Berlin", "Munich", "Frankfurt", "Bremerhaven"],
        "India": ["Mumbai", "Delhi", "Chennai", "Kolkata", "Mundra", "Nhava Sheva"],
        "Vietnam": ["Ho Chi Minh City", "Haiphong", "Da Nang"],
        "UK": ["London", "Felixstowe", "Southampton", "Liverpool"],
        "Canada": ["Toronto", "Montreal", "Vancouver"],
        "UAE": ["Dubai", "Abu Dhabi", "Sharjah"],
        "Netherlands": ["Rotterdam", "Amsterdam"],
        "Italy": ["Genoa", "Naples"],
        "Spain": ["Valencia", "Barcelona"],
        "Global": []
    };

    const [formData, setFormData] = useState({
        title: "", description: "",
        material_type: "Plastic", category: "",
        product_code: "", // Geri geldi
        quantity: "", unit: "tons",
        price: "", currency: "USD",
        packaging: "Bales", // Geri geldi
        supply_type: "One-Time", // Geri geldi
        street_address: "", city: "", country: "", zip_code: "",
        target_audience: "All Users"
    });

    const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleCountryChange = (e: any) => {
        setFormData({ ...formData, country: e.target.value, city: "" });
    };

    const handleImageChange = (e: any) => { if (e.target.files) setImages(Array.from(e.target.files)); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const uploadedUrls = [];
        for (const file of images) {
            const fileName = `${user.id}/${Date.now()}-${file.name}`;
            const { error } = await supabase.storage.from("listings").upload(fileName, file);
            if (!error) {
                const { data } = supabase.storage.from("listings").getPublicUrl(fileName);
                uploadedUrls.push(data.publicUrl);
            }
        }

        const { error } = await supabase.from("listings").insert({
            user_id: user.id,
            ...formData,
            quantity: parseFloat(formData.quantity) || 0,
            price: parseFloat(formData.price) || 0,
            images: uploadedUrls,
            status: "active",
        });

        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Listing published successfully!");
            router.push("/profile");
        }
        setLoading(false);
        setUploading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Create a Listing</h1>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-8">

                    {/* MATERIAL INFO (DETAYLI HALİ) */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">Material Details</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Material Type</label>
                                <select name="material_type" value={formData.material_type} onChange={handleChange} className="w-full p-3 border rounded-lg">
                                    <option value="Plastic">Plastic</option>
                                    <option value="Metal">Metal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 border rounded-lg" required>
                                    <option value="">Select Category</option>
                                    {categories[formData.material_type].map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* PRODUCT CODE (GERİ GELDİ) */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Product Code (HS Code)</label>
                            <select name="product_code" value={formData.product_code} onChange={handleChange} className="w-full p-3 border rounded-lg bg-gray-50">
                                <option value="">Select Code (Optional)</option>
                                {productCodes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                            <input name="title" placeholder="e.g. Clear LDPE Film 98/2" value={formData.title} onChange={handleChange} className="w-full p-3 border rounded-lg" required />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                            <textarea name="description" rows={4} placeholder="Describe quality, contamination..." value={formData.description} onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>
                    </section>

                    {/* LOGISTICS & PRICE (DETAYLI HALİ) */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">Logistics & Price</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                                <div className="flex gap-2">
                                    <input name="quantity" type="number" placeholder="20" onChange={handleChange} className="w-full p-3 border rounded-lg" required />
                                    <select name="unit" onChange={handleChange} className="p-3 border rounded-lg bg-gray-50"><option>tons</option><option>lbs</option><option>kg</option></select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Price</label>
                                <div className="flex gap-2">
                                    <input name="price" type="number" placeholder="1000" onChange={handleChange} className="w-full p-3 border rounded-lg" required />
                                    <select name="currency" onChange={handleChange} className="p-3 border rounded-lg bg-gray-50"><option>USD</option><option>EUR</option></select>
                                </div>
                            </div>
                        </div>

                        {/* PACKAGING & SUPPLY TYPE (GERİ GELDİ) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Packaging</label>
                                <select name="packaging" value={formData.packaging} onChange={handleChange} className="w-full p-3 border rounded-lg">
                                    {packagingOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Supply Type</label>
                                <select name="supply_type" value={formData.supply_type} onChange={handleChange} className="w-full p-3 border rounded-lg">
                                    <option value="One-Time">One-Time (Spot)</option>
                                    <option value="Ongoing">Ongoing (Contract)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* LOCATION (GLOBAL & DETAYLI) */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">Location</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Street Address</label>
                            <input name="street_address" placeholder="123 Industrial Park" onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Country</label>
                                <select name="country" value={formData.country} onChange={handleCountryChange} className="w-full p-3 border rounded-lg bg-white">
                                    <option value="">Select Country</option>
                                    {Object.keys(countryData).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">City</label>
                                {countryData[formData.country]?.length > 0 ? (
                                    <select name="city" value={formData.city} onChange={handleChange} className="w-full p-3 border rounded-lg bg-white">
                                        <option value="">Select City</option>
                                        {countryData[formData.country].map((c: string) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                ) : (
                                    <input name="city" placeholder="City Name" onChange={handleChange} className="w-full p-3 border rounded-lg" />
                                )}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Zip Code</label>
                            <input name="zip_code" placeholder="10001" onChange={handleChange} className="w-full p-3 border rounded-lg" />
                        </div>
                    </section>

                    {/* AUDIENCE & PHOTOS (ŞIK BUTONLU) */}
                    <section>
                        <div className="mb-6 bg-green-50 p-4 rounded-lg border border-green-100">
                            <label className="block text-sm font-bold text-green-900 mb-2">Who can see this?</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="target_audience" value="All Users" checked={formData.target_audience === "All Users"} onChange={handleChange} /> All Users</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="target_audience" value="Premium Only" checked={formData.target_audience === "Premium Only"} onChange={handleChange} /> Premium Users Only 💎</label>
                            </div>
                        </div>

                        {/* ŞIK FOTOĞRAF ALANI */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Photos</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition">
                                <div className="text-4xl mb-2">📷</div>
                                <p className="text-sm text-gray-500 mb-4">Drag & drop or click to upload</p>
                                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-100">
                                    + Add Photos
                                    <input type="file" multiple onChange={handleImageChange} className="hidden" />
                                </label>
                                {images.length > 0 && <p className="mt-4 text-green-600 font-bold">{images.length} photos selected</p>}
                            </div>
                        </div>
                    </section>

                    <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg">
                        {loading ? (uploading ? "Uploading Images..." : "Publishing...") : "Post Listing"}
                    </button>
                </form>
            </div>
        </div>
    );
}