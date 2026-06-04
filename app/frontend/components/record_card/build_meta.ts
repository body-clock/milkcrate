import type { Listing } from "../../types/inertia";

export function buildMeta(listing: Listing): string {
  return [listing.label, listing.year, listing.condition].filter(Boolean).join(" · ");
}
