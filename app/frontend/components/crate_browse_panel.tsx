import CrateChipBar from "./crate_chip_bar";
import InlineCrateStage from "./inline_crate_stage";
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
}

export default function CrateBrowsePanel({
  config,
  crates,
  activeSlug,
  startIndex,
  onSelectCrate,
}: Props) {
  const activeCrate = activeSlug
    ? (crates.find((crate) => crate.slug === activeSlug) ?? null)
    : null;

  return (
    <section role="region" aria-label={config.ariaLabel} className="space-y-4">
      <CrateChipBar
        title={config.title}
        description={config.description}
        crates={crates}
        activeSlug={activeSlug}
        onSelectCrate={onSelectCrate}
      />

      {activeCrate ? (
        <InlineCrateStage
          crates={crates}
          activeSlug={activeSlug}
          startIndex={startIndex}
          onSelectCrate={onSelectCrate}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-5 text-sm text-mc-text-dim">
          {config.emptyText}
        </div>
      )}
    </section>
  );
}
