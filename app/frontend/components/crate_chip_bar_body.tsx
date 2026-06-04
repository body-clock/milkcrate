import type { Crate } from "../types/inertia";
import { CrateChipHeader } from "./crate_chip_header";
import CrateTabs from "./crate_tabs";

interface Props {
  title: string;
  description?: string;
  crates: Crate[];
  selectedSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function CrateChipBarBody(props: Props) {
  return (
    <div className="rounded-2xl border border-mc-border bg-mc-bg-card px-3 py-3 shadow-sm">
      <CrateChipHeader
        title={props.title}
        description={props.description}
        crateCount={props.crates.length}
      />
      <CrateTabs
        crates={props.crates}
        activeSlug={props.selectedSlug}
        onSelect={(s) => props.onSelectCrate(s)}
        compact
      />
    </div>
  );
}
