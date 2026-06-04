import { usePileContext } from "@/contexts/pile_context";
import type { Listing } from "@/types/inertia";

import { PileAddButton } from "./pile_add_button";
import { PileInButton } from "./pile_in_button";

export function PileToggleButton({ listing }: { listing: Listing }) {
  const { inPile } = usePileContext();
  return inPile(listing.id) ? (
    <PileInButton listing={listing} />
  ) : (
    <PileAddButton listing={listing} />
  );
}
