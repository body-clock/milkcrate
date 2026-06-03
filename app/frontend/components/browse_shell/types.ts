import type { BrowseMode } from "@/hooks/use_browse_routing";
import type { Crate } from "@/types/inertia";

export type SharedData = {
  mode: BrowseMode;
  wall: Crate | null;
  currentCrates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
};

export type ShellHandlers = {
  handleWallSelected: () => void;
  handleBrowseModeSelected: (nextMode: "featured" | "genres") => void;
};
