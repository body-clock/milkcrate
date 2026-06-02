import CrateChipBar from "./crate_chip_bar";
import { CrateBrowseContent } from "./crate_browse_content";
import type { Crate } from "../types/inertia";

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

export default function CrateBrowsePanel({ config, crates, activeSlug, startIndex, onSelectCrate, hideChipBar = false }: Props) {
  const activeCrate = activeSlug ? (crates.find((c) => c.slug === activeSlug) ?? null) : null;
  return (
    <section role="region" aria-label={config.ariaLabel} className="space-y-4">
      {!hideChipBar && <CrateChipBar title={config.title} description={config.description} crates={crates} activeSlug={activeSlug} onSelectCrate={onSelectCrate} />}
      <CrateBrowseContent activeCrate={activeCrate} crates={crates} activeSlug={activeSlug} startIndex={startIndex} onSelectCrate={onSelectCrate} emptyText={config.emptyText} />
    </section>
  );
}
