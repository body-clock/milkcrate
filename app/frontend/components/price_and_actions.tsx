import { ActionLink } from "@/components/ui/action";
import { PileButton } from "@/components/ui/pile_button";
import { formatPrice } from "@/lib/format_price";
import type { Listing } from "@/types/inertia";

function storeSlugFromPath(): string {
  return window.location.pathname.replace(/^\//, "");
}

function buildUtmUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("utm_source", "milkcrate");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "store_browse");
    url.searchParams.set("utm_content", storeSlugFromPath());
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function trackClick(listingId: number): void {
  navigator.sendBeacon(
    "/click",
    new URLSearchParams({
      store_slug: storeSlugFromPath(),
      listing_id: String(listingId),
    }),
  );
}

interface PriceAndActionsProps {
  listing: Listing;
  inPile: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function PriceAndActions({ listing, inPile, onAdd, onRemove }: PriceAndActionsProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-mc-border">
      <span className="text-2xl font-medium whitespace-nowrap">{formatPrice(listing)}</span>
      <div className="flex gap-2">
        <PileButton inPile={inPile} onAdd={onAdd} onRemove={onRemove} />
        <ActionLink
          variant="secondary"
          href={buildUtmUrl(listing.discogs_url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(listing.id)}
          aria-label={`View listing for ${listing.title ?? "this record"} on Discogs (opens in new tab)`}
        >
          Discogs ↗
        </ActionLink>
      </div>
    </div>
  );
}
