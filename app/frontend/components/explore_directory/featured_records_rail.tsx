import React, { useCallback, useRef } from "react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const resumeTimeout = useRef<NodeJS.Timeout | null>(null);

  const pauseAnimation = useCallback(() => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    containerRef.current?.classList.add("paused");
  }, []);

  const resumeAnimation = useCallback(() => {
    resumeTimeout.current = setTimeout(() => {
      containerRef.current?.classList.remove("paused");
    }, 2000);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    scrollStart.current = containerRef.current?.scrollLeft ?? 0;
    pauseAnimation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pauseAnimation]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollStart.current - dx;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    resumeAnimation();
  }, [resumeAnimation]);

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
      <div
        ref={containerRef}
        className="rail-container group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: "pan-y" }}
      >
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
    cursor: grab;
  }
  .rail-container:active {
    cursor: grabbing;
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
  .rail-container:hover .rail-track,
  .rail-container.paused .rail-track {
    animation-play-state: paused;
  }
  @keyframes scroll-rail {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;
