import type { Crate } from "../../../types/inertia";

export interface CrateTabState {
  crates: Crate[];
  activeSlug: string;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export type CrateHeaderLayoutMode = "full" | "compact" | "minimal" | "no-tabs";

export interface CrateHeaderProps {
  isCompact: boolean;
  onBack?: () => void;
  tabs: CrateTabState;
  activeCrate: Crate | undefined;
  total: number;
  layoutMode: CrateHeaderLayoutMode;
}
