import { compositedLayer } from "../../lib/motion_tokens";
import type { Listing } from "../../types/inertia";
import type { CrateWindowSlot } from "../../lib/crate_window";

interface HintCardProps {
  slot: CrateWindowSlot<Listing>;
  prefersReducedMotion: boolean;
}

const HINT_X_OFFSET = 16;
const HINT_Y_BASE = 12;
const HINT_ROTATE_FACTOR = -4;
const HINT_SCALE_DECAY = 0.045;
const HINT_Z_INDEX_BASE = 10;
const HINT_OPACITY = 0.38;

function hintTransition(prefersReducedMotion: boolean): string {
  if (prefersReducedMotion) {
    return "transform 0.01s ease-out, opacity 0.01s ease-out";
  }
  return "transform 0.2s ease-out, opacity 0.2s ease-out";
}

function hintTransform(slot: CrateWindowSlot<Listing>): string {
  const depth = Math.abs(slot.offset);
  const baseX = slot.offset * HINT_X_OFFSET;
  const baseY = depth * HINT_Y_BASE;
  const baseRotate = slot.offset * HINT_ROTATE_FACTOR;
  const scale = 1 - depth * HINT_SCALE_DECAY;
  return `translate(${baseX}px, ${baseY}px) rotate(${baseRotate}deg) scale(${scale})`;
}

function renderHintCardImage(hintUrl: string | null | undefined) {
  if (hintUrl) {
    return (
      <img
        src={hintUrl}
        alt=""
        className="w-full h-full object-cover saturate-75"
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-mc-text-dim text-5xl">
      ♪
    </div>
  );
}

/**
 * A translucent hint card shown behind the active record card,
 * displaying adjacent records in the crate stack.
 */
export default function HintCard({ slot, prefersReducedMotion }: HintCardProps) {
  const depth = Math.abs(slot.offset);

  return (
    <div
      aria-hidden="true"
      data-riffle-slot={slot.offset}
      className="absolute inset-0 rounded-lg overflow-hidden border border-mc-border bg-mc-bg-raised shadow-lg pointer-events-none"
      style={{
        ...compositedLayer(true),
        zIndex: HINT_Z_INDEX_BASE - depth,
        opacity: HINT_OPACITY,
        transform: hintTransform(slot),
        transition: hintTransition(prefersReducedMotion),
      }}
    >
      {renderHintCardImage(slot.record.thumbnail_url ?? slot.record.cover_image_url)}
      <div className="absolute inset-0 bg-mc-bg/35" />
    </div>
  );
}
