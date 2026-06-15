import React from "react";

import FeaturedRecordTile from "./featured_record_tile";

export interface FeaturedRecord {
  id: number;
  title: string | null;
  artist: string | null;
  cover_image_url: string | null;
  store_slug: string;
  store_name: string;
}

interface Props {
  records: FeaturedRecord[];
  label: string;
}

export default function FeaturedRecordsRail({ records, label }: Props) {
  if (records.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mc-section-header">
        <h2 className="mc-section-name">{label}</h2>
        <span className="mc-section-count">{records.length}</span>
      </div>
      <div
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0"
        style={{ scrollbarWidth: "none" }}
      >
        {records.map((record) => (
          <FeaturedRecordTile key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}
