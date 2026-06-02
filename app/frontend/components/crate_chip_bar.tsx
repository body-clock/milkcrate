import CrateTabs from "./crate_tabs";
import type { Crate } from "../types/inertia";
import { CrateChipEmpty } from "./crate_chip_empty";
import { CrateChipHeader } from "./crate_chip_header";

interface Props {
  title: string;
  description?: string;
  crates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}


export default function CrateChipBar({
  title,
  description,
  crates,
  activeSlug,
  onSelectCrate,
}: Props) {
  if (crates.length === 0) {return <CrateChipEmpty title={title} />;}
  const selectedSlug = activeSlug && crates.some((c) => c.slug === activeSlug) ? activeSlug : null;
  return (
    <div className="rounded-2xl border border-mc-border bg-mc-bg-card px-3 py-3 shadow-sm">
      <CrateChipHeader title={title} description={description} crateCount={crates.length} />
      <CrateTabs crates={crates} activeSlug={selectedSlug} onSelect={(s) => onSelectCrate(s)} compact />
    </div>
  );
}
