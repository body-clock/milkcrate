import type { Crate } from "@/types/inertia";
import CrateTabs from "@/components/crate_tabs";

interface Props {
  title: string;
  crates: Crate[];
  activeSlug: string | null;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

export default function SidebarCrateList({ title, crates, activeSlug, onSelectCrate }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-mc-text-dim mb-2 px-1">{title}</h3>
      <CrateTabs crates={crates} activeSlug={activeSlug} onSelect={onSelectCrate} vertical />
    </div>
  );
}
