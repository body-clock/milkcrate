import CrateView from "@/components/crate_view";
import type { Crate } from "@/types/inertia";

interface Props {
  allCrates: Crate[];
  activeSlug: string;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
}

export default function DirectEntryView({
  allCrates,
  activeSlug,
  startIndex,
  selectCrate,
  backToStore,
}: Props) {
  return (
    <CrateView
      crates={allCrates}
      activeSlug={activeSlug}
      startIndex={startIndex}
      onSelectCrate={selectCrate}
      onBack={backToStore}
    />
  );
}
