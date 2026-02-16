const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_LISTING_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const LISTINGS_BUCKET = "listings";

type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const MIME_EXTENSION_MAP: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export {
  ALLOWED_IMAGE_MIME_TYPES,
  LISTINGS_BUCKET,
  MAX_LISTING_IMAGE_SIZE_BYTES,
};

export function isAllowedListingImageType(mimeType: string): mimeType is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType);
}

export function getListingImageExtension(mimeType: AllowedImageMimeType) {
  return MIME_EXTENSION_MAP[mimeType];
}

export function buildListingImageStoragePath(userId: string, listingId: string, mimeType: AllowedImageMimeType) {
  const extension = getListingImageExtension(mimeType);
  return `${userId}/${listingId}/${crypto.randomUUID()}.${extension}`;
}

export function extractStoragePathFromPublicUrl(publicUrl: string, bucketName = LISTINGS_BUCKET) {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const pathWithQuery = publicUrl.slice(markerIndex + marker.length);
  const [path] = pathWithQuery.split("?");
  return decodeURIComponent(path || "");
}
