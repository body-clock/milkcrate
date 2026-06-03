import { type RiffleDirection } from "../../lib/riffle_navigation";
import NavigationButtons from "./navigation_buttons";
import ProgressBarSection from "./progress_bar_section";

interface CrateProgressProps {
  index: number;
  total: number;
  progress: number;
  edgeStatus: string | null;
  isCompact: boolean;
  prefersReducedMotion: boolean;
  navigate: (dir: RiffleDirection) => void;
}

function renderEdgeStatus(edgeStatus: string | null) {
  if (!edgeStatus) { return null; }
  return <p className="mt-2 text-center text-[11px] text-mc-text-dim" aria-live="polite">{edgeStatus}</p>;
}

export default function CrateProgress({ index, total, progress, edgeStatus, isCompact, prefersReducedMotion, navigate }: CrateProgressProps) {
  return (
    <>
      <ProgressBarSection index={index} total={total} progress={progress} isCompact={isCompact} prefersReducedMotion={prefersReducedMotion} />
      <NavigationButtons index={index} total={total} isCompact={isCompact} navigate={navigate} />
      {renderEdgeStatus(edgeStatus)}
    </>
  );
}
