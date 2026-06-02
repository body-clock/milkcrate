import type { Listing } from "@/types/inertia";

import { PriceActions } from "./price_actions";
import { RecordMetadata } from "./record_metadata";
import { RecordNotes } from "./record_notes";
import { RecordTagsList } from "./record_tags_list";
import { RecordTileSection } from "./record_tile_section";

export function PeekSheetContent({
  listing,
  meta,
  allTags,
}: {
  listing: Listing;
  meta: string;
  allTags: { label: string; dim: boolean }[];
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="grid gap-4">
        <RecordTileSection listing={listing} isCompact={false} />
        <div className="flex flex-col gap-4">
          <RecordMetadata listing={listing} meta={meta} />
          <RecordTagsList allTags={allTags} />
          <RecordNotes notes={listing.notes} />
          <PriceActions listing={listing} />
        </div>
      </div>
    </div>
  );
}
