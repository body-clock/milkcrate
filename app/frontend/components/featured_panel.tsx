import CrateChipBar from "./crate_chip_bar";
import CompactCrateStage from "./compact_crate_stage";
import type { Crate } from "../types/inertia";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function FeaturedPanel({ crates, activeSlug, startIndex, onSelectCrate }: Props) {
  const activeCrate = activeSlug ? crates.find((crate) => crate.slug === activeSlug) ?? null : null;

  return (
    <section role="region" aria-label="Featured" className="space-y-4">
      <CrateChipBar
        title="Featured"
        description="Featured bins from this store's inventory."
        crates={crates}
        activeSlug={activeSlug}
        onSelectCrate={onSelectCrate}
      />

      {activeCrate ? (
        <CompactCrateStage
          crates={crates}
          activeSlug={activeSlug}
          startIndex={startIndex}
          onSelectCrate={onSelectCrate}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-5 text-sm text-mc-text-dim">
          Pick a Featured crate to start digging.
        </div>
      )}
    </section>
  );
}
