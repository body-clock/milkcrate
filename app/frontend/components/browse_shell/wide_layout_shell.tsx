import type { BrowseMode } from "@/hooks/use_browse_routing";

import WideLayout from "./wide_layout";
import type { SharedData, ShellHandlers } from "./types";

interface Props extends SharedData, ShellHandlers {
  listingCount?: number;
  genreCount?: number;
}

export default function WideLayoutShell(props: Props) {
  const { mode, wall, currentCrates, activeSlug, startIndex, selectCrate, listingCount, genreCount, handleWallSelected, handleBrowseModeSelected } = props;
  const onBrowse = handleBrowseModeSelected as (mode: BrowseMode) => void;
  return (
    <WideLayout
      mode={mode}
      wall={wall!}
      currentCrates={currentCrates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      selectCrate={selectCrate}
      listingCount={listingCount ?? 0}
      genreCount={genreCount}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={onBrowse}
    />
  );
}
