import { usePileContext } from "@/contexts/pile_context";
import { formatPrice } from "@/lib/format_price";
import { COPY } from "@/lib/copy";
import Button from "@/components/ui/button";
import { ActionLink } from "@/components/ui/action";
import type { Listing } from "@/types/inertia";

function InPileButton({ listing }: { listing: Listing }) {
  const { removeFromPile } = usePileContext();

  return (
    <div className="w-[6.75rem]">
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => removeFromPile(listing.id)}
      >
        ✓ In pile
      </Button>
    </div>
  );
}

function AddToPileButton({ listing }: { listing: Listing }) {
  const { addToPile } = usePileContext();

  return (
    <div className="w-[6.75rem]">
      <Button className="w-full" onClick={() => addToPile(listing)}>
        + Pile
      </Button>
    </div>
  );
}

function PileToggleButton({ listing }: { listing: Listing }) {
  const { inPile } = usePileContext();

  return inPile(listing.id) ? <InPileButton listing={listing} /> : <AddToPileButton listing={listing} />;
}

export function PriceActions({ listing }: { listing: Listing }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-mc-border">
      <span className="text-2xl font-semibold whitespace-nowrap">
        {formatPrice(listing)}
      </span>
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
