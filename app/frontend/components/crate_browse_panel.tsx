import type { Crate } from "../types/inertia";
import { CrateBrowseContent } from "./crate_browse_content";
import CrateChipBar from "./crate_chip_bar";

export type CrateBrowseMode = "featured" | "genres";

export interface CrateBrowsePanelConfig {
  title: string;
  description: string;
  ariaLabel: string;
  emptyText: string;
}

interface Props {
  config: CrateBrowsePanelConfig;
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  /** When true, the CrateChipBar is rendered externally (e.g. in a sidebar). */
  hideChipBar?: boolean;
}

interface PanelChipBarProps {
  config: CrateBrowsePanelConfig;
  crates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

function PanelChipBar({
  config,
  crates,
  activeSlug,
  onSelectCrate,
  hideChipBar,
}: PanelChipBarProps) {
  if (hideChipBar) return null;
  return (
    <CrateChipBar
      title={config.title}
      description={config.description}
      crates={crates}
      activeSlug={activeSlug}
      onSelectCrate={onSelectCrate}
    />
  );
}

interface PanelContentProps {
  config: CrateBrowsePanelConfig;
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  hideChipBar: boolean;
}

function PanelContent({
  config,
  crates,
  activeSlug,
  startIndex,
  onSelectCrate,
  hideChipBar,
}: PanelContentProps) {
  const activeCrate = activeSlug
    ? (crates.find((c) => c.slug === activeSlug) ?? null)
    : null;
  return (
    <>
      <PanelChipBar
        config={config}
        crates={crates}
        activeSlug={activeSlug}
        onSelectCrate={onSelectCrate}
        hideChipBar={hideChipBar}
      />
      <CrateBrowseContent
        activeCrate={activeCrate}
        crates={crates}
        activeSlug={activeSlug}
        startIndex={startIndex}
        onSelectCrate={onSelectCrate}
        emptyText={config.emptyText}
      />
    </>
  );
}

export default function CrateBrowsePanel(props: Props) {
  return (
    <section
      role="region"
      aria-label={props.config.ariaLabel}
      className="space-y-4"
    >
      <PanelContent {...props} hideChipBar={props.hideChipBar ?? false} />
    </section>
  );
}
