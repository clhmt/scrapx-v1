"use client";

import Link from "next/link";
import { Listing } from "@/types";
import { useState } from "react";

interface ListingCardProps {
    listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
    const [imageError, setImageError] = useState(false);

    // Determine fallback image if loading fails or no images
    const placeholderImage = "https://via.placeholder.com/400x300?text=No+Image";

    // Use first image or fallback
    const imageUrl = listing.images && listing.images.length > 0 && !imageError
        ? listing.images[0]
        : placeholderImage;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full">
            {/* Image Container */}
            <div className="relative h-48 bg-gray-100">
                <img
                    src={imageUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                />

                {/* Category Badge */}
                <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 backdrop-blur-sm bg-opacity-90">
                        {listing.category}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                    {/* Title - Truncated to 2 lines */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-emerald-600">
                        <Link href={`/listings/${listing.id}`}>
                            {listing.title}
                        </Link>
                    </h3>

                    <div className="flex items-center text-sm text-gray-500 mb-3 space-x-2">
                        <span className="flex items-center text-xs sm:text-sm truncate">
                            📍 {listing.city || "Unknown City"}, {listing.country || "Global"}
                        </span>
                    </div>

                    {/* Attributes */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {listing.condition}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {listing.quantity} {listing.unit}
                        </span>
                    </div>
                </div>

                {/* Footer: Price and Action */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">Price</span>
                        <span className="text-lg font-bold text-gray-900">
                            ${listing.price.toLocaleString()}
                            <span className="text-sm font-normal text-gray-500">/{listing.unit}</span>
                        </span>
                    </div>

                    <Link
                        href={`/listings/${listing.id}`}
                        className="inline-flex items-center px-3 py-2 border border-emerald-600 text-sm font-medium rounded-md text-emerald-600 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                    >
                        View Details
                    </Link>
                </div>
            </div>
        </div>
    );
}
