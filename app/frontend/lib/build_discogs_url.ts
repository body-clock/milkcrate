import type { Listing } from "@/types/inertia";

/**
 * Builds a Discogs URL with UTM tracking parameters.
 */
export function buildDiscogsUrl(
  baseUrl: string,
  storeSlug: string,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", "milkcrate");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "store_browse");
  url.searchParams.set("utm_content", storeSlug);
  return url.toString();
}

/**
 * Tracks an outbound Discogs click via sendBeacon (fire-and-forget).
 */
export function trackDiscogsClick(
  storeId: number,
  listingId: number | null,
): void {
  const body = new URLSearchParams();
  body.set("store_id", String(storeId));
  if (listingId) {
    body.set("listing_id", String(listingId));
  }
  navigator.sendBeacon("/click", body);
}
