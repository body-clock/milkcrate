import Button from "@/components/ui/button";
import { usePileContext } from "@/contexts/pile_context";
import type { Listing } from "@/types/inertia";

export function PileAddButton({ listing }: { listing: Listing }) {
  const { addToPile } = usePileContext();
  return (
    <div className="w-[6.75rem]">
      <Button className="w-full" onClick={() => addToPile(listing)}>
        + Pile
      </Button>
    </div>
  );
}
