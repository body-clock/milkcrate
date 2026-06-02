import { COPY } from "@/lib/copy";
import type { Listing } from "@/types/inertia";

export function RecordMetadata({
  listing,
  meta,
}: {
  listing: Listing;
  meta: string;
}) {
  return (
    <div>
      <div className="text-lg font-semibold leading-tight">
        {listing.title ?? COPY.peekSheet.untitledRecord}
      </div>
      <div className="mt-1 text-sm text-mc-text-dim">
        {listing.artist ?? COPY.peekSheet.unknownArtist}
      </div>
      {meta && (
        <p id="wall-peek-meta" className="mt-2 text-xs text-mc-text-dim leading-relaxed">
          {meta}
        </p>
      )}
    </div>
  );
}
