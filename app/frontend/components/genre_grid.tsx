import CrateSectionGrid from "./crate_section_grid";
import { COPY } from "@/lib/copy";
import type { Crate } from "../types/inertia";

interface Props {
  crates: Crate[];
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function GenreGrid({ crates, onSelectCrate }: Props) {
  return (
    <CrateSectionGrid
      title="Browse by genre"
      count={crates.length}
      crates={crates}
      variant="genre"
      columnCount={(isCompact, isComfy) => (isCompact ? 2 : isComfy ? 3 : 4)}
      onSelectCrate={onSelectCrate}
      gap="gap-3 sm:gap-4"
      description={COPY.storeFloor.genreDescription}
    />
  );
}
