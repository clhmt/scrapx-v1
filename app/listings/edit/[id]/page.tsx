"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

export default function EditListing() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    // Create sayfasıyla birebir aynı state yapısı
    const [formData, setFormData] = useState<any>({
        material_type: "Plastic",
        category: "",
        hs_code: "",
        title: "",
        description: "",
        quantity: "",
        unit: "tons",
        price: "",
        currency: "USD",
        packaging: "Bales",
        supply_type: "One-Time (Spot)",
        terms: "CIF",
        address: "",
        country: "",
        city: "",
        zip_code: "",
        images: []
    });

    useEffect(() => {
        fetchListing();
    }, [id]);

    const fetchListing = async () => {
        const { data, error } = await supabase.from("listings").select("*").eq("id", id).single();
        if (data) {
            // Veritabanından gelen veriyi form state'ine aktar
            setFormData({ ...formData, ...data });
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Güncelleme isteği
        const { error } = await supabase.from("listings").update({
            material_type: formData.material_type,
            category: formData.category,
            hs_code: formData.hs_code,
            title: formData.title,
            description: formData.description,
            quantity: formData.quantity,
            unit: formData.unit,
            price: formData.price,
            currency: formData.currency,
            packaging: formData.packaging,
            supply_type: formData.supply_type,
            terms: formData.terms,
            address: formData.address,
            country: formData.country,
            city: formData.city,
            zip_code: formData.zip_code
            // Not: image upload mantığı karmaşık olduğu için şu an text olarak güncelleniyor
        }).eq("id", id);

        if (!error) {
            router.push("/profile");
        } else {
            alert("Error updating listing: " + error.message);
        }
    };

    if (loading) return <div className="p-20 text-center font-bold">Loading Listing Details...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tighter">Edit Listing</h1>
                    <button type="button" onClick={() => router.back()} className="text-gray-400 font-bold hover:text-gray-600">Cancel</button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">

                    {/* Material Details Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Material Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Material Type</label>
                                <select value={formData.material_type} onChange={(e) => setFormData({ ...formData, material_type: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="Plastic">Plastic</option>
                                    <option value="Metal">Metal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="">Select Category</option>
                                    <option value="PET">PET</option>
                                    <option value="HDPE">HDPE</option>
                                    <option value="LDPE">LDPE</option>
                                    <option value="PP">PP</option>
                                    <option value="Copper">Copper</option>
                                    <option value="Aluminium">Aluminium</option>
                                    <option value="Iron & Steel">Iron & Steel</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Product Code (HS Code)</label>
                            <input type="text" value={formData.hs_code || ""} onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" placeholder="Select Code (Optional)" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                            <input type="text" required value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Clear LDPE Film 98/2" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                            <textarea required rows={4} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" placeholder="Describe quality, contamination..."></textarea>
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2 text-center">Photos</h2>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50/50">
                            {formData.images && formData.images.length > 0 ? (
                                <div className="flex justify-center gap-4 mb-4">
                                    {formData.images.map((img: string, idx: number) => (
                                        <div key={idx} className="relative w-24 h-24">
                                            <img src={img} alt="preview" className="w-full h-full object-cover rounded-lg border shadow-sm" />
                                            <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600">X</button>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                            <button type="button" className="font-bold text-gray-600 bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm">+ Add More Photos</button>
                        </div>
                    </div>

                    {/* Logistics & Price Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Logistics & Price</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Quantity</label>
                                    <input type="number" required value={formData.quantity || ""} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-bold text-transparent mb-1">Unit</label>
                                    <select value={formData.unit || "tons"} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="tons">tons</option>
                                        <option value="lbs">lbs</option>
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Price</label>
                                    <input type="number" required value={formData.price || ""} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-bold text-transparent mb-1">Currency</label>
                                    <select value={formData.currency || "USD"} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Packaging</label>
                                <select value={formData.packaging || "Bales"} onChange={(e) => setFormData({ ...formData, packaging: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="Bales">Bales</option>
                                    <option value="Big Bags">Big Bags</option>
                                    <option value="Loose">Loose</option>
                                    <option value="Rolls">Rolls</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Supply Type</label>
                                <select value={formData.supply_type || "One-Time (Spot)"} onChange={(e) => setFormData({ ...formData, supply_type: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="One-Time (Spot)">One-Time (Spot)</option>
                                    <option value="Regular (Contract)">Regular (Contract)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Terms (CIF/FOB)</label>
                                <select value={formData.terms || "CIF"} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="CIF">CIF</option>
                                    <option value="FOB">FOB</option>
                                    <option value="EXW">EXW</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Location</h2>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Street Address</label>
                            <input type="text" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" placeholder="123 Industrial Park" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Country</label>
                                <select value={formData.country || ""} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50 font-medium outline-none focus:ring-2 focus:ring-green-500">
                                    <option value="">Select Country</option>
                                    <option value="USA">USA</option>
                                    <option value="Turkey">Turkey</option>
                                    <option value="Germany">Germany</option>
                                    <option value="China">China</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                                <input type="text" value={formData.city || ""} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" placeholder="City Name" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Zip Code</label>
                                <input type="text" value={formData.zip_code || ""} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })} className="w-full p-3 border rounded-lg font-medium outline-none focus:ring-2 focus:ring-green-500" placeholder="10001" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg hover:bg-green-700 transition shadow-md hover:shadow-lg">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}