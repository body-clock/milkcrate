import type { Listing } from "@/types/inertia";

import { ScoreRow } from "./score_row";
import { ScoreTotalRow } from "./score_total_row";

interface Props {
  listing: Listing;
}

const STRATEGY_LABELS: Record<string, string> = {
  vintage: "Vintage",
  condition: "Condition",
  desirability: "Want/Have",
  metadata: "Metadata",
  cover_quality: "Cover",
  freshness: "Freshness",
  noise: "Noise",
  price: "Price",
};

export default function ScoreBreakdown({ listing }: Props) {
  if (!listing.score_breakdown) {
    return null;
  }

  const breakdown = listing.score_breakdown;
  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return (
    <div className="mt-2 mb-1 rounded border border-mc-border/50 bg-mc-bg-raised/70 px-2.5 py-1.5 text-[10px] font-mono leading-snug">
      <div className="mb-0.5 text-[9px] uppercase tracking-wider text-mc-text-dim/50 font-semibold">
        Score
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-px">
        {Object.entries(breakdown).flatMap(([key, value]) => (
          <ScoreRow key={key} id={key} label={STRATEGY_LABELS[key] ?? key} value={value} />
        ))}
      </div>
      <ScoreTotalRow total={total} />
    </div>
  );
}
