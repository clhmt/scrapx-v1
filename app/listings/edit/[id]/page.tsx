"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";

// --- CONSTANTS ---
const FINAL_PLASTICS = ['ABS', 'HDPE', 'LDPE', 'PET', 'PVC', 'PP', 'PS'];
const FINAL_METALS = ['Copper', 'Aluminium', 'Brass', 'Stainless Steel', 'Lead', 'Zinc', 'Iron & Steel', 'E-Scrap', 'Magnesium', 'Mixed'];

const packagingTypes = ["Bales", "Rolls", "Grinded", "Pellets", "Loose", "Gaylord boxes"];
const pricingTerms = ["CIF", "FOB", "EXW"];
const currencies = ["USD", "EUR", "GBP", "CNY"];
const units = ["tons", "kg", "lbs"];
const conditions = ["Clean", "Mixed", "Scrap", "Regrind", "Virgin", "Off-Grade"];

const countries = ["USA", "Turkey", "China", "Germany", "UK", "India", "Canada", "Vietnam", "Malaysia"];

const citiesByCountry: Record<string, string[]> = {
    "USA": ["New York", "Los Angeles", "Chicago", "Houston", "New Jersey", "Miami", "Seattle"],
    "Turkey": ["Istanbul", "Izmir", "Mersin", "Gebze", "Bursa", "Antalya"],
    "China": ["Shanghai", "Ningbo", "Shenzhen", "Guangzhou", "Tianjin"],
    "Germany": ["Hamburg", "Berlin", "Munich", "Frankfurt"],
    "UK": ["London", "Manchester", "Liverpool"],
    "India": ["Mumbai", "Delhi", "Chennai"],
    "Canada": ["Toronto", "Montreal", "Vancouver"],
    "Vietnam": ["Ho Chi Minh City", "Hanoi"],
    "Malaysia": ["Kuala Lumpur", "Penang"],
};

export default function EditListing() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [materialType, setMaterialType] = useState('Plastic');
    const currentCategories = materialType === 'Plastic' ? FINAL_PLASTICS : FINAL_METALS;

    const [title, setTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedCondition, setSelectedCondition] = useState("");
    const [productCode, setProductCode] = useState("");
    const [description, setDescription] = useState("");

    const [packagingType, setPackagingType] = useState("");
    const [images, setImages] = useState<string[]>([]); // URLs for existing
    const [newImages, setNewImages] = useState<File[]>([]); // New uploads

    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("tons");
    const [supplyType, setSupplyType] = useState("One-Time");

    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [pricingTerm, setPricingTerm] = useState("");

    const [address, setAddress] = useState("");
    const [country, setCountry] = useState("");
    const [city, setCity] = useState("");
    const [zipCode, setZipCode] = useState("");

    useEffect(() => {
        fetchListing();
    }, []);

    const fetchListing = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const { data, error } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            alert("Listing not found");
            router.push("/profile");
            return;
        }

        // Check ownership
        if (data.user_id !== user.id) {
            alert("You do not have permission to edit this listing.");
            router.push("/");
            return;
        }

        // Populate Form
        setMaterialType(data.material_type);
        setTitle(data.title);
        setSelectedCategory(data.category);
        setSelectedCondition(data.condition);
        setProductCode(data.product_code || "");
        setDescription(data.description);
        setPackagingType(data.packaging_type);
        setImages(data.images || []);
        setQuantity(data.quantity.toString());
        setUnit(data.unit);
        setSupplyType(data.supply_type);
        setPrice(data.price.toString());
        setCurrency(data.currency);
        setPricingTerm(data.pricing_terms);
        setAddress(data.address || "");
        setCountry(data.country || "");
        setCity(data.city || "");
        setZipCode(data.zip_code || "");

        setLoading(false);
    };

    const handleNewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewImages([...newImages, ...Array.from(e.target.files)]);
        }
    };

    const removeExistingImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setNewImages(newImages.filter((_, i) => i !== index));
    };

    const uploadNewImages = async (userId: string) => {
        const urls = [];
        for (const file of newImages) {
            const fileName = `${userId}/${Date.now()}_${file.name}`;
            const { error } = await supabase.storage.from('listings').upload(fileName, file);
            if (!error) {
                const { data } = supabase.storage.from('listings').getPublicUrl(fileName);
                urls.push(data.publicUrl);
            }
        }
        return urls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newImageUrls = await uploadNewImages(user.id);
        const finalImages = [...images, ...newImageUrls];

        const { error } = await supabase.from('listings').update({
            title,
            description,
            material_type: materialType,
            category: selectedCategory,
            condition: selectedCondition,
            product_code: productCode,
            packaging_type: packagingType,
            packaging: packagingType, // Legacy support
            price: parseFloat(price),
            currency,
            pricing_terms: pricingTerm,
            quantity: parseFloat(quantity),
            unit,
            supply_type: supplyType,
            images: finalImages,
            address,
            city,
            country,
            zip_code: zipCode,
            location: `${city}, ${country}`,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (error) alert(error.message);
        else { alert("Listing updated successfully!"); router.push("/profile"); }
        setSaving(false);
    };

    if (loading) return <div className="p-10 text-center">Loading listing data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <Navbar />
            <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-xl">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Edit Listing</h1>
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">Cancel</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* TYPE SELECTOR */}
                    <div className="flex gap-4">
                        <button type="button" onClick={() => setMaterialType('Plastic')}
                            className={`flex-1 p-4 rounded-lg border font-bold ${materialType === 'Plastic' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-50'}`}>
                            Plastics
                        </button>
                        <button type="button" onClick={() => setMaterialType('Metal')}
                            className={`flex-1 p-4 rounded-lg border font-bold ${materialType === 'Metal' ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50'}`}>
                            Metals
                        </button>
                    </div>

                    {/* CATEGORY SELECTOR */}
                    <div>
                        <label className="block font-medium mb-1">Category</label>
                        <select className="w-full p-3 border rounded-lg" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} required>
                            <option value="">Select Category</option>
                            {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* OTHER INPUTS */}
                    <input className="w-full p-3 border rounded-lg" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />

                    <div className="grid grid-cols-2 gap-4">
                        <select className="p-3 border rounded-lg" value={selectedCondition} onChange={e => setSelectedCondition(e.target.value)} required>
                            <option value="">Condition</option>
                            {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input className="p-3 border rounded-lg" placeholder="Product Code" value={productCode} onChange={e => setProductCode(e.target.value)} />
                    </div>

                    <textarea className="w-full p-3 border rounded-lg" rows={4} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} required />

                    {/* IMAGE MANAGEMENT */}
                    <div className="border-2 border-dashed p-6 rounded-lg text-center">
                        <p className="font-bold mb-4">Photos</p>

                        {/* Current Images */}
                        <div className="flex gap-4 mb-4 flex-wrap justify-center">
                            {images.map((img, i) => (
                                <div key={i} className="relative w-20 h-20">
                                    <img src={img} className="w-full h-full object-cover rounded border" />
                                    <button type="button" onClick={() => removeExistingImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">X</button>
                                </div>
                            ))}
                            {newImages.map((img, i) => (
                                <div key={`new-${i}`} className="relative w-20 h-20">
                                    <img src={URL.createObjectURL(img)} className="w-full h-full object-cover rounded border opacity-70" />
                                    <span className="absolute bottom-0 left-0 bg-green-500 text-white text-xs px-1">NEW</span>
                                    <button type="button" onClick={() => removeNewImage(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">X</button>
                                </div>
                            ))}
                        </div>

                        <input type="file" multiple onChange={handleNewImageUpload} className="hidden" id="edit-file-upload" />
                        <label htmlFor="edit-file-upload" className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-200">
                            + Add More Photos
                        </label>
                    </div>

                    {/* AVAILABILITY */}
                    <div className="grid grid-cols-3 gap-4">
                        <input type="number" className="p-3 border rounded-lg" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                        <select className="p-3 border rounded-lg" value={unit} onChange={e => setUnit(e.target.value)}>
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select className="p-3 border rounded-lg" value={packagingType} onChange={e => setPackagingType(e.target.value)} required>
                            <option value="">Packaging</option>
                            {packagingTypes.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    {/* PRICE */}
                    <div className="grid grid-cols-3 gap-4">
                        <input type="number" className="p-3 border rounded-lg" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} required />
                        <select className="p-3 border rounded-lg" value={currency} onChange={e => setCurrency(e.target.value)}>
                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="p-3 border rounded-lg" value={pricingTerm} onChange={e => setPricingTerm(e.target.value)} required>
                            <option value="">Terms (CIF/FOB)</option>
                            {pricingTerms.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* LOCATION */}
                    <div className="space-y-4">
                        <input className="w-full p-3 border rounded-lg" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} required />
                        <div className="grid grid-cols-3 gap-4">
                            <select className="p-3 border rounded-lg" value={country} onChange={e => setCountry(e.target.value)} required>
                                <option value="">Country</option>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {/* SIMPLE CITY LOGIC */}
                            {country && citiesByCountry[country] ? (
                                <select className="p-3 border rounded-lg" value={city} onChange={e => setCity(e.target.value)} required>
                                    <option value="">City</option>
                                    {citiesByCountry[country].map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="Other">Other</option>
                                </select>
                            ) : (
                                <input className="p-3 border rounded-lg" placeholder="City" value={city} onChange={e => setCity(e.target.value)} required />
                            )}

                            <input className="p-3 border rounded-lg" placeholder="Zip Code" value={zipCode} onChange={e => setZipCode(e.target.value)} />
                        </div>
                    </div>

                    <button type="submit" disabled={saving} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-green-700">
                        {saving ? "Saving Changes..." : "Save Changes"}
                    </button>
                </form>
            </div>
        </div>
    );
}
