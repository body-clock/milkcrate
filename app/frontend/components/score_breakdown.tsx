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
    <div className="mt-2 mb-1 rounded border border-mc-border/50 bg-mc-bg-raised/70 p-2 text-[10px] leading-relaxed font-mono">
      <div className="mb-1 text-[9px] uppercase tracking-wider text-mc-text-dim/60 font-semibold">
        Score Debug
      </div>
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3 tabular-nums text-mc-text-dim">
          <span>{STRATEGY_LABELS[key] ?? key}</span>
          <span className={value >= 0 ? "text-mc-accent" : "text-red-400"}>
            {value >= 0 ? "+" : ""}{value.toFixed(2)}
          </span>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-3 border-t border-mc-border/30 pt-1 font-semibold tabular-nums text-mc-text">
        <span>Total</span>
        <span className={total >= 0 ? "text-mc-accent" : "text-red-400"}>
          {total >= 0 ? "+" : ""}{total.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
