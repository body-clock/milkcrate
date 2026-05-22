import type { Listing } from "@/types/inertia"

interface Props {
  listing: Listing
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
}

export default function ScoreBreakdown({ listing }: Props) {
  if (!listing.score_breakdown) return null

  const breakdown = listing.score_breakdown
  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

  return (
    <div className="mt-2 mb-1 w-44 rounded border border-mc-border/50 bg-mc-bg-raised/70 px-2.5 py-1.5 text-[10px] font-mono leading-snug">
      <div className="mb-0.5 text-[9px] uppercase tracking-wider text-mc-text-dim/50 font-semibold">
        Score
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-px">
        {Object.entries(breakdown).flatMap(([key, value]) => [
          <span key={`l-${key}`} className="truncate tabular-nums text-mc-text-dim/80">
            {STRATEGY_LABELS[key] ?? key}
          </span>,
          <span
            key={`v-${key}`}
            className={`text-right tabular-nums ${value >= 0 ? "text-mc-accent" : "text-red-400"}`}
          >
            {value >= 0 ? "+" : ""}{value.toFixed(1)}
          </span>,
        ])}
      </div>
      <div className="mt-0.5 flex justify-between border-t border-mc-border/20 pt-0.5 text-mc-text font-semibold tabular-nums">
        <span>Total</span>
        <span className={total >= 0 ? "text-mc-accent" : "text-red-400"}>
          {total >= 0 ? "+" : ""}{total.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
