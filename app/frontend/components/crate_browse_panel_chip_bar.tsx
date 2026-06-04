import type { Crate } from "../types/inertia";
import type { CrateBrowsePanelConfig } from "./crate_browse_panel";
import CrateChipBar from "./crate_chip_bar";

interface Props {
  config: CrateBrowsePanelConfig;
  crates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

export default function PanelChipBar(props: Props) {
  if (props.hideChipBar) {
    return null;
  }
  return (
    <CrateChipBar
      title={props.config.title}
      description={props.config.description}
      crates={props.crates}
      activeSlug={props.activeSlug}
      onSelectCrate={props.onSelectCrate}
    />
  );
}
