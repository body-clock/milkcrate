import CrateSectionGrid from "./crate_section_grid";
import type { Crate } from "../types/inertia";

interface Props {
  crates: Crate[];
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function FeaturedCratesRow({ crates, onSelectCrate }: Props) {
  return (
    <CrateSectionGrid
      title="Featured"
      count={crates.length}
      crates={crates}
      variant="featured"
      columnCount={(isCompact, isComfy) => (isCompact ? 1 : isComfy ? 2 : 3)}
      onSelectCrate={onSelectCrate}
      description="Featured bins from this store's inventory"
    />
  );
}
