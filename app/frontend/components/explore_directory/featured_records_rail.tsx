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

  // Duplicate records for seamless loop
  const loopRecords = [...records, ...records];

  return (
    <section>
      <style>{scrollKeyframes}</style>
      <div className="mc-section-header">
        <h2 className="mc-section-name">{label}</h2>
        <span className="mc-section-count">{records.length}</span>
      </div>
      <div className="rail-container group">
        <div className="rail-track">
          {loopRecords.map((record, index) => (
            <FeaturedRecordTile key={`${record.id}-${index}`} record={record} />
          ))}
        </div>
      </div>
    </section>
  );
}

const scrollKeyframes = `
  .rail-container {
    overflow-x: hidden;
    scrollbar-width: none;
  }
  .rail-container::-webkit-scrollbar {
    display: none;
  }
  .rail-track {
    display: flex;
    gap: 0.75rem;
    width: max-content;
    animation: scroll-rail 60s linear infinite;
  }
  .rail-container:hover .rail-track {
    animation-play-state: paused;
  }
  @keyframes scroll-rail {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;
