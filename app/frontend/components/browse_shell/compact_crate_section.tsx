import CrateTabs from "@/components/crate_tabs";
import type { Crate } from "@/types/inertia";

interface Props {
  show: boolean;
  crates: Crate[];
  activeSlug: string | null;
  onSelect: (slug: string, startIndex?: number) => void;
}

function navTabClasses(_compact: boolean, selected: boolean): string {
  const base =
    "whitespace-nowrap rounded-[1rem] cursor-pointer transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-1 focus-visible:ring-offset-mc-bg min-h-9 px-2.5 py-1 text-xs";
  const color = selected
    ? "bg-mc-accent text-mc-on-accent font-semibold"
    : "text-mc-text-dim hover:text-mc-text";
  return `${base} ${color}`;
}

export default function CompactCrateSection({ show, crates, activeSlug, onSelect }: Props) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: show ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        <div className="pt-1.5">
          <CrateTabs
            crates={crates}
            activeSlug={activeSlug}
            onSelect={(slug) => onSelect(slug)}
            compact
            classesFn={navTabClasses}
            disableScrollOnActivate
          />
        </div>
      </div>
    </div>
  );
}
