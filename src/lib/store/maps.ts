import type { JsonLdBusiness, MapsListing } from "@/lib/store/types";

interface PlacesResponse {
  places?: {
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    priceLevel?: string;
    googleMapsUri?: string;
    addressComponents?: { longText?: string; types?: string[] }[];
  }[];
}

export function mapsAvailable(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

/** Look up the store's Google Maps listing with the Places API (New) text search. */
export async function findMapsListing(query: string): Promise<MapsListing | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel,places.googleMapsUri,places.addressComponents"
      },
      body: JSON.stringify({ textQuery: query, regionCode: "GB", pageSize: 1 })
    });
    if (!res.ok) return null;
    const place = ((await res.json()) as PlacesResponse).places?.[0];
    if (!place?.displayName?.text) return null;
    return {
      name: place.displayName.text,
      address: place.formattedAddress,
      locality: place.addressComponents?.find((c) => c.types?.includes("postal_town") || c.types?.includes("locality"))
        ?.longText,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      types: place.types ?? [],
      priceLevel: place.priceLevel,
      mapsUrl: place.googleMapsUri,
      source: "google-places"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function listingFromJsonLd(biz: JsonLdBusiness | null, fallbackName: string): MapsListing | null {
  if (!biz || (!biz.address && !biz.rating)) return null;
  return {
    name: biz.name ?? fallbackName,
    address: biz.address,
    locality: biz.locality,
    rating: biz.rating,
    reviewCount: biz.reviewCount,
    types: [],
    source: "json-ld"
  };
}
