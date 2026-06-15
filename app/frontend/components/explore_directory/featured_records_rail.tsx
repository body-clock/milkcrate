import React, { useCallback, useEffect, useRef, useState } from "react";

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

const SCROLL_SPEED = 0.25; // pixels per frame
const PAUSE_ON_HOVER = true;

export default function FeaturedRecordsRail({ records, label }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);
  const animationRef = useRef<number | null>(null);

  const scroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || isPaused.current) {
      animationRef.current = requestAnimationFrame(scroll);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    // Reset to start when we reach the end (seamless loop)
    if (scrollLeft >= maxScroll) {
      container.scrollLeft = 0;
    } else {
      container.scrollLeft += SCROLL_SPEED;
    }

    animationRef.current = requestAnimationFrame(scroll);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scroll]);

  const handleMouseEnter = () => {
    if (PAUSE_ON_HOVER) isPaused.current = true;
  };

  const handleMouseLeave = () => {
    isPaused.current = false;
  };

  if (records.length === 0) {
    return null;
  }

  // Duplicate records for seamless loop
  const loopRecords = [...records, ...records];

  return (
    <section>
      <div className="mc-section-header">
        <h2 className="mc-section-name">{label}</h2>
        <span className="mc-section-count">{records.length}</span>
      </div>
      <div
        ref={scrollRef}
        className="flex overflow-x-hidden gap-3 pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ scrollbarWidth: "none" }}
      >
        {loopRecords.map((record, index) => (
          <FeaturedRecordTile key={`${record.id}-${index}`} record={record} />
        ))}
      </div>
    </section>
  );
}
