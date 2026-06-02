import CrateTabs from "./crate_tabs";
import { COPY } from "@/lib/copy";
import type { Crate } from "../types/inertia";

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
  if (crates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-mc-border bg-mc-bg-card/70 px-4 py-5 text-sm text-mc-text-dim">
        {COPY.emptyCrate(title)}
      </div>
    );
  }

  const selectedSlug =
    activeSlug && crates.some((crate) => crate.slug === activeSlug) ? activeSlug : null;

  return (
    <div className="rounded-2xl border border-mc-border bg-mc-bg-card px-3 py-3 shadow-sm">
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-mc-border pb-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-none">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-mc-text-dim leading-relaxed">{description}</p>
          )}
        </div>
        <span className="flex-shrink-0 text-xs uppercase tracking-[0.16em] text-mc-text-dim">
          {crates.length} crates
        </span>
      </div>

      <CrateTabs
        crates={crates}
        activeSlug={selectedSlug}
        onSelect={(slug) => onSelectCrate(slug)}
        compact
      />
    </div>
  );
}
