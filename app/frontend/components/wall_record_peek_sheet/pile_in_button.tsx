import Button from "@/components/ui/button";
import { usePileContext } from "@/contexts/pile_context";
import type { Listing } from "@/types/inertia";

export function PileInButton({ listing }: { listing: Listing }) {
  const { removeFromPile } = usePileContext();
  return (
    <div className="w-[6.75rem]">
      <Button variant="secondary" className="w-full" onClick={() => removeFromPile(listing.id)}>
        ✓ In pile
      </Button>
    </div>
  );
}
