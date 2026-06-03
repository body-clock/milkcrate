import type { Crate } from "../types/inertia";
import { CrateBrowseContent } from "./crate_browse_content";
import type { CrateBrowsePanelConfig } from "./crate_browse_panel";
import PanelChipBar from "./crate_browse_panel_chip_bar";

interface Props {
  config: CrateBrowsePanelConfig;
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

function findActiveCrate(crates: Crate[], activeSlug: string | null): Crate | null {
  return activeSlug ? (crates.find((c) => c.slug === activeSlug) ?? null) : null;
}

export default function PanelContent(props: Props) {
  return (
    <>
      <PanelChipBar config={props.config} crates={props.crates} activeSlug={props.activeSlug} onSelectCrate={props.onSelectCrate} hideChipBar={props.hideChipBar} />
      <CrateBrowseContent
        activeCrate={findActiveCrate(props.crates, props.activeSlug)}
        crates={props.crates}
        activeSlug={props.activeSlug}
        startIndex={props.startIndex}
        onSelectCrate={props.onSelectCrate}
        emptyText={props.config.emptyText}
      />
    </>
  );
}
