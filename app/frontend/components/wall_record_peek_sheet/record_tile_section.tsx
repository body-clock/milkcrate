import RecordTile from "@/components/record_tile";
import type { Listing } from "@/types/inertia";

export function RecordTileSection({
  listing,
  isCompact,
}: {
  listing: Listing;
  isCompact: boolean;
}) {
  return (
    <div className={isCompact ? "mx-auto w-full max-w-[16rem]" : "w-full"}>
      <RecordTile listing={listing} imageLoading="eager" className="rounded-xl" />
    </div>
  );
}
