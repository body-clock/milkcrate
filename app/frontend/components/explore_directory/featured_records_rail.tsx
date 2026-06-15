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

const BASE_SPEED = 0.3; // pixels per frame

export default function FeaturedRecordsRail({ records, label }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const velocity = useRef(BASE_SPEED);
  const targetVelocity = useRef(BASE_SPEED);
  const animFrame = useRef<number | null>(null);
  const trackWidth = useRef(0);

  const animate = useCallback(() => {
    const track = trackRef.current;
    if (!track) {
      animFrame.current = requestAnimationFrame(animate);
      return;
    }

    // Measure half the track (one set of records) for looping
    if (trackWidth.current === 0) {
      trackWidth.current = track.scrollWidth / 2;
    }

    // Ease velocity toward target
    velocity.current += (targetVelocity.current - velocity.current) * 0.05;

    // Move
    posRef.current -= velocity.current;

    // Loop: reset when we've scrolled one full set
    if (trackWidth.current > 0 && posRef.current <= -trackWidth.current) {
      posRef.current += trackWidth.current;
    }

    track.style.transform = `translateX(${posRef.current}px)`;

    animFrame.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [animate]);

  const handleMouseEnter = () => { targetVelocity.current = 0; };
  const handleMouseLeave = () => { targetVelocity.current = BASE_SPEED; };

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
        className="overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={trackRef}
          className="flex gap-3 will-change-transform"
          style={{ width: "max-content" }}
        >
          {loopRecords.map((record, index) => (
            <FeaturedRecordTile key={`${record.id}-${index}`} record={record} />
          ))}
        </div>
      </div>
    </section>
  );
}
