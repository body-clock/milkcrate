import type { RiffleDirection } from "../../lib/riffle_navigation";
import type { Listing } from "../../types/inertia";
import { buildCrateWindow } from "../../lib/crate_window";
import CardStack from "./card_stack";
import CrateProgress from "./crate_progress";
import RecordDetails from "../record_details";

interface CrateViewContentProps {
  header: React.ReactNode;
  isCompact: boolean;
  visibleRecords: ReturnType<typeof buildCrateWindow<Listing>>;
  activeSlug: string;
  prefersReducedMotion: boolean;
  direction: React.RefObject<RiffleDirection>;
  showGestureHint: boolean;
  total: number;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
  handleDragEnd: (info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => void;
  index: number;
  progress: number;
  edgeStatus: string | null;
  navigate: (dir: RiffleDirection) => void;
  activeRecord: Listing | undefined;
}

function renderCards(props: CrateViewContentProps) {
  return (
    <div className="flex flex-col">
      <CardStack isCompact={props.isCompact} visibleRecords={props.visibleRecords}
        activeSlug={props.activeSlug} prefersReducedMotion={props.prefersReducedMotion}
        direction={props.direction} showGestureHint={props.showGestureHint} total={props.total}
        dragRotationRef={props.dragRotationRef} handleDragEnd={props.handleDragEnd} />
      <CrateProgress index={props.index} total={props.total} progress={props.progress}
        edgeStatus={props.edgeStatus} isCompact={props.isCompact}
        prefersReducedMotion={props.prefersReducedMotion} navigate={props.navigate} />
    </div>
  );
}

function renderDetails(props: CrateViewContentProps) {
  if (!props.activeRecord) { return null; }
  return (
    <div className="hidden md:flex md:flex-col md:pt-7">
      <RecordDetails listing={props.activeRecord} direction={props.direction.current} />
    </div>
  );
}

export default function CrateViewContent(props: CrateViewContentProps) {
  return (
    <div className="flex flex-col">
      {props.header}
      <div className="md:mx-auto md:w-full md:grid md:grid-cols-[420px_1fr] md:gap-12 md:items-start">
        {renderCards(props)}
        {renderDetails(props)}
      </div>
    </div>
  );
}
