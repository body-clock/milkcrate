import ScoreBreakdown from "@/components/score_breakdown";
import type { Listing } from "@/types/inertia";

interface ScoreSectionProps {
  show: boolean;
  listing: Listing;
  onToggle: () => void;
}

export function ScoreSection({ show, listing, onToggle }: ScoreSectionProps) {
  if (!listing.score_breakdown) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="text-[10px] text-mc-text-dim/40 hover:text-mc-text-dim/70 transition-colors self-end"
      >
        {show ? "Hide score" : "Score"}
      </button>
      {show && <ScoreBreakdown listing={listing} />}
    </>
  );
}
