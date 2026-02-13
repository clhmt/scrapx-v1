"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

export default function EditListing() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        fetchListing();
    }, [id]);

    const fetchListing = async () => {
        const { data, error } = await supabase.from("listings").select("*").eq("id", id).single();
        if (data) setFormData(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from("listings").update(formData).eq("id", id);
        if (!error) router.push("/profile");
    };

    if (loading || !formData) return <div className="p-20 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">Edit Listing</h1>
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">Cancel</button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    {/* Material Details Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2">Material Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Material Type</label>
                                <select value={formData.material_type} onChange={(e) => setFormData({ ...formData, material_type: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50">
                                    <option>Plastic</option>
                                    <option>Metal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50">
                                    <option>PET</option>
                                    <option>HDPE</option>
                                    <option>Copper</option>
                                    <option>Aluminium</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Product Code (HS Code)</label>
                            <input type="text" value={formData.hs_code || ""} onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="e.g. 3915.10" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full p-3 border rounded-lg" />
                        </div>
                    </div>

                    {/* Logistics & Price Section (Create ile Aynı) */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold border-b pb-2">Logistics & Price</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Quantity</label>
                                <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full p-3 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Price (per unit)</label>
                                <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full p-3 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Terms</label>
                                <select value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50">
                                    <option>CIF</option>
                                    <option>FOB</option>
                                    <option>EXW</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Packaging</label>
                                <select value={formData.packaging} onChange={(e) => setFormData({ ...formData, packaging: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50">
                                    <option>Bales</option>
                                    <option>Big Bags</option>
                                    <option>Loose</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Supply Type</label>
                                <select value={formData.supply_type} onChange={(e) => setFormData({ ...formData, supply_type: e.target.value })} className="w-full p-3 border rounded-lg bg-gray-50">
                                    <option>One-Time (Spot)</option>
                                    <option>Regular (Contract)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg">
                        Save Changes
                    </button>
                </form>
            </div>
        </div>
    );
}