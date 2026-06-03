import type { Crate } from "../types/inertia";
import { CrateBrowseEmpty } from "./crate_browse_empty";
import InlineCrateStage from "./inline_crate_stage";

// eslint-disable-next-line eslint/max-lines-per-function
export function CrateBrowseContent({
  activeCrate,
  crates,
  activeSlug,
  startIndex,
  onSelectCrate,
  emptyText,
}: {
  activeCrate: Crate | null;
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  emptyText: string;
}) {
  if (activeCrate) {
    return (
      <InlineCrateStage
        crates={crates}
        activeSlug={activeSlug}
        startIndex={startIndex}
        onSelectCrate={onSelectCrate}
      />
    );
  }
  return <CrateBrowseEmpty emptyText={emptyText} />;
}
