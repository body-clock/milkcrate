import InlineCrateStage from "./inline_crate_stage";
import { CrateBrowseEmpty } from "./crate_browse_empty";
import type { Crate } from "../types/inertia";

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
