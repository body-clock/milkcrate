import React, { useCallback, useEffect, useRef } from "react";

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

const TARGET_SPEED = 0.5; // pixels per frame at full speed
const EASE_IN = 0.95; // velocity multiplier when hovering (approaches 0)
const EASE_OUT = 0.98; // velocity multiplier when leaving (approaches target)

export default function FeaturedRecordsRail({ records, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const velocity = useRef(TARGET_SPEED);
  const isHovering = useRef(false);
  const animFrame = useRef<number | null>(null);
  const accumulator = useRef(0);

  const animate = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      animFrame.current = requestAnimationFrame(animate);
      return;
    }

    // Ease velocity toward target or zero
    if (isHovering.current) {
      velocity.current *= EASE_IN;
    } else {
      velocity.current += (TARGET_SPEED - velocity.current) * (1 - EASE_OUT);
    }

    // Stop updating when velocity is negligible
    if (velocity.current > 0.01) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;

      // Reset for seamless loop
      if (scrollLeft >= maxScroll) {
        container.scrollLeft = 0;
        accumulator.current = 0;
      } else {
        accumulator.current += velocity.current;
        if (accumulator.current >= 1) {
          container.scrollLeft += Math.floor(accumulator.current);
          accumulator.current -= Math.floor(accumulator.current);
        }
      }
    }

    animFrame.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [animate]);

  if (records.length === 0) {
    return null;
  }

  const loopRecords = [...records, ...records];

  return (
    <section>
      <div className="mc-section-header">
        <h2 className="mc-section-name">{label}</h2>
        <span className="mc-section-count">{records.length}</span>
      </div>
      <div
        ref={containerRef}
        className="flex gap-3 pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0"
        style={{ overflowX: "auto", scrollbarWidth: "none" }}
        onMouseEnter={() => { isHovering.current = true; }}
        onMouseLeave={() => { isHovering.current = false; }}
      >
        {loopRecords.map((record, index) => (
          <FeaturedRecordTile key={`${record.id}-${index}`} record={record} />
        ))}
      </div>
    </section>
  );
}
