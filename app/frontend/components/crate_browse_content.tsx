import type { Crate } from "../types/inertia";
import { CrateBrowseEmpty } from "./crate_browse_empty";
import InlineCrateStage from "./inline_crate_stage";

type CrateBrowseContentProps = {
  activeCrate: Crate | null;
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  emptyText: string;
};

export function CrateBrowseContent({
  activeCrate,
  crates,
  activeSlug,
  startIndex,
  onSelectCrate,
  emptyText,
}: CrateBrowseContentProps) {
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
