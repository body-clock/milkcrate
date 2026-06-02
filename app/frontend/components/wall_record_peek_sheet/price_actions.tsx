import { ActionLink } from "@/components/ui/action";
import { COPY } from "@/lib/copy";
import { formatPrice } from "@/lib/format_price";
import type { Listing } from "@/types/inertia";

import { PileToggleButton } from "./pile_toggle_button";

export function PriceActions({ listing }: { listing: Listing }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-mc-border">
      <span className="text-2xl font-semibold whitespace-nowrap">{formatPrice(listing)}</span>
      <div className="flex gap-2">
        <PileToggleButton listing={listing} />
        <ActionLink
          variant="secondary"
          href={listing.discogs_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={COPY.discogsLinkLabel(listing.title)}
        >
          {COPY.discogsLinkText}
        </ActionLink>
      </div>
    </div>
  );
}
