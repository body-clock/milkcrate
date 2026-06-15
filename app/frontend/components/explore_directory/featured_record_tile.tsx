import { Link } from "@inertiajs/react";

import RecordTile from "@/components/record_tile";

import type { FeaturedRecord } from "./featured_records_rail";

export default function FeaturedRecordTile({ record }: { record: FeaturedRecord }) {
  return (
    <Link
      href={`/${record.store_slug}`}
      className="shrink-0 w-[45vw] sm:w-[200px] lg:w-[220px] flex flex-col group"
    >
      <div className="w-full aspect-square">
        <RecordTile listing={record} tactileHover imageLoading="lazy" />
      </div>
      <p className="mt-2 text-xs text-mc-text-dim leading-tight">{record.store_name}</p>
    </Link>
  );
}
