import Button from "@/components/ui/button";
import { ActionLink } from "@/components/ui/action";
import { formatPrice } from "@/lib/format_price";
import type { Listing } from "@/types/inertia";

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
        {inPile ? (
          <Button variant="secondary" onClick={onRemove}>
            ✓ In pile
          </Button>
        ) : (
          <Button onClick={onAdd}>+ Pile</Button>
        )}
        <ActionLink
          variant="secondary"
          href={listing.discogs_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View listing for ${listing.title ?? "this record"} on Discogs (opens in new tab)`}
        >
          Discogs ↗
        </ActionLink>
      </div>
    </div>
  );
}
