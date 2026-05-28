import { compositedLayer } from "../../lib/motion_tokens";
import type { Listing } from "../../types/inertia";
import type { CrateWindowSlot } from "../../lib/crate_window";

interface HintCardStackProps {
  visibleRecords: CrateWindowSlot<Listing>[];
  prefersReducedMotion: boolean;
}

/**
 * Renders translucent hint cards behind the active record card,
 * showing the adjacent records in the crate stack.
 */
export default function HintCardStack({
  visibleRecords,
  prefersReducedMotion,
}: HintCardStackProps) {
  return (
    <>
      {visibleRecords
        .filter((s) => !s.isActive)
        .map((slot) => {
          const depth = Math.abs(slot.offset);
          const hintUrl = slot.record.thumbnail_url ?? slot.record.cover_image_url;
          const baseX = slot.offset * 16;
          const baseY = depth * 12;
          const baseRotate = slot.offset * -4;
          const scale = 1 - depth * 0.045;

          return (
            <div
              key={`hint-${slot.record.id}`}
              aria-hidden="true"
              data-riffle-slot={slot.offset}
              className="absolute inset-0 rounded-lg overflow-hidden border border-mc-border bg-mc-bg-raised shadow-lg pointer-events-none"
              style={{
                ...compositedLayer(true),
                zIndex: 10 - depth,
                opacity: 0.38,
                transform: `translate(${baseX}px, ${baseY}px) rotate(${baseRotate}deg) scale(${scale})`,
                transition: prefersReducedMotion
                  ? "transform 0.01s ease-out, opacity 0.01s ease-out"
                  : "transform 0.2s ease-out, opacity 0.2s ease-out",
              }}
            >
              {hintUrl ? (
                <img
                  src={hintUrl}
                  alt=""
                  className="w-full h-full object-cover saturate-75"
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-5xl">
                  ♪
                </div>
              )}
              <div className="absolute inset-0 bg-mc-bg/35" />
            </div>
          );
        })}
    </>
  );
}
