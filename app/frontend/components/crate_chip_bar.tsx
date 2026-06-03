import type { Crate } from "../types/inertia";
import { CrateChipEmpty } from "./crate_chip_empty";
import CrateChipBarBody from "./crate_chip_bar_body";

interface Props {
  title: string;
  description?: string;
  crates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function CrateChipBar(props: Props) {
  if (props.crates.length === 0) {
    return <CrateChipEmpty title={props.title} />;
  }
  const selectedSlug =
    props.activeSlug && props.crates.some((c) => c.slug === props.activeSlug) ? props.activeSlug : null;
  return (
    <CrateChipBarBody
      title={props.title}
      description={props.description}
      crates={props.crates}
      selectedSlug={selectedSlug}
      onSelectCrate={props.onSelectCrate}
    />
  );
}
