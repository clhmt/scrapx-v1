import Link from 'next/link';

// DÜZELTME: Eksik olan 'quantity' ve 'unit' eklendi
interface Listing {
    id: string;
    title: string;
    price: number;
    currency: string;
    material_type: string;
    city: string;
    country: string;
    images: string[];
    quantity?: number; // ? işareti "olmayabilir de" demek (hata önler)
    unit?: string;
}

interface ListingCardProps {
    listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
    return (
        <Link href={`/listings/${listing.id}`} className="block group">
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                {/* Resim Alanı */}
                <div className="aspect-[4/3] relative bg-gray-100">
                    {listing.images && listing.images.length > 0 ? (
                        <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                            <span className="text-2xl">📷</span>
                        </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold shadow-sm uppercase">
                        {listing.material_type}
                    </div>
                </div>

                {/* İçerik */}
                <div className="p-4">
                    <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="font-bold text-gray-900 truncate flex-1">{listing.title}</h3>
                        <span className="text-green-700 font-bold whitespace-nowrap">
                            {listing.currency} {listing.price}
                        </span>
                    </div>

                    <div className="flex items-center text-sm text-gray-500 mb-3">
                        <span className="truncate">📍 {listing.city}, {listing.country}</span>
                    </div>

                    {/* Miktar Alanı (Hata buradaydı, artık düzeldi) */}
                    <div className="flex flex-wrap gap-2">
                        {listing.quantity && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                📦 {listing.quantity} {listing.unit}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}