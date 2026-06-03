import WideLayout from "./wide_layout";
import type { SharedData, ShellHandlers } from "./types";

interface Props extends SharedData, ShellHandlers {
  listingCount?: number;
  genreCount?: number;
}

export default function WideLayoutShell(props: Props) {
  const { mode, wall, currentCrates, activeSlug, startIndex, selectCrate, listingCount, genreCount, handleWallSelected, handleBrowseModeSelected } = props;
  return (
    <WideLayout
      mode={mode}
      wall={wall}
      currentCrates={currentCrates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      selectCrate={selectCrate}
      listingCount={listingCount ?? 0}
      genreCount={genreCount}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={handleBrowseModeSelected}
    />
  );
}
