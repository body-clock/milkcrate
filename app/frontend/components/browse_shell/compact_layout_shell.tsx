import CompactLayout from "./compact_layout";
import type { SharedData, ShellHandlers } from "./types";

type Props = SharedData & ShellHandlers;

export default function CompactLayoutShell(props: Props) {
  const {
    mode,
    wall,
    currentCrates,
    activeSlug,
    startIndex,
    selectCrate,
    handleWallSelected,
    handleBrowseModeSelected,
  } = props;

  return (
    <CompactLayout
      mode={mode}
      wall={wall}
      currentCrates={currentCrates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      selectCrate={selectCrate}
      onWallSelect={handleWallSelected}
      onBrowseModeSelect={handleBrowseModeSelected}
    />
  );
}
