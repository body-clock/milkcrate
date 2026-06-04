import type { RiffleDirection } from "@/lib/riffle_navigation";

export interface CrateNavDeps {
  total: number;
  isCompact: boolean;
  indexRef: React.MutableRefObject<number>;
  direction: React.MutableRefObject<RiffleDirection>;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface ResetEffectDeps {
  initialIndex: number;
  resetKey: string;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface NavigationState {
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  showGestureHint: boolean;
  setShowGestureHint: React.Dispatch<React.SetStateAction<boolean>>;
  edgeStatus: string | null;
  setEdgeStatus: React.Dispatch<React.SetStateAction<string | null>>;
  direction: React.MutableRefObject<RiffleDirection>;
  indexRef: React.MutableRefObject<number>;
  dragRotationRef: React.RefObject<HTMLDivElement | null>;
}
