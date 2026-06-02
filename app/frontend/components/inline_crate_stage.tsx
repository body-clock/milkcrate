import CrateView from "./crate_view";
import type { Crate } from "../types/inertia";

interface Props {
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function InlineCrateStage({ crates, activeSlug, startIndex, onSelectCrate }: Props) {
  if (!activeSlug) {return null;}

  return (
    <CrateView
      crates={crates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      compactHeaderOwnedByLayout
      hideTabs
      onSelectCrate={onSelectCrate}
    />
  );
}
