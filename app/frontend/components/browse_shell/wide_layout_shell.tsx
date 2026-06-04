import type { SharedData, ShellHandlers } from "./types";
import WideLayout from "./wide_layout";

interface Props extends SharedData, ShellHandlers {
  listingCount?: number;
  genreCount?: number;
}

export default function WideLayoutShell(props: Props) {
  return (
    <WideLayout
      mode={props.mode}
      wall={props.wall}
      currentCrates={props.currentCrates}
      activeSlug={props.activeSlug}
      startIndex={props.startIndex}
      selectCrate={props.selectCrate}
      listingCount={props.listingCount ?? 0}
      genreCount={props.genreCount}
      onWallSelect={props.handleWallSelected}
      onBrowseModeSelect={props.handleBrowseModeSelected}
    />
  );
}
