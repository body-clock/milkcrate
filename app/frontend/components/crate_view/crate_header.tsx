import CrateTabs from "../crate_tabs";
import { IconBackButton, TextBackButton } from "../back_button";
import type { Crate } from "../../types/inertia";

interface CrateTabState {
  crates: Crate[];
  activeSlug: string;
  onSelectCrate: (slug: string, startIndex?: number) => void;
}

type CrateHeaderLayoutMode = "full" | "compact" | "minimal" | "no-tabs";

interface CrateHeaderProps {
  isCompact: boolean;
  onBack?: () => void;
  tabs: CrateTabState;
  activeCrate: Crate | undefined;
  total: number;
  layoutMode: CrateHeaderLayoutMode;
}

/**
 * Shared header for crate views — handles both compact and desktop layouts.
 * Displays back navigation, crate name, record count, and crate tabs.
 *
 * `layoutMode` replaces the old `hideTabs` + `compactHeaderOwnedByLayout` booleans:
 * - "full": show back button, crate info, and tabs (old: hideTabs=false, compactHeaderOwnedByLayout=false)
 * - "compact": show crate info only, tabs owned by parent (old: hideTabs=false, compactHeaderOwnedByLayout=true)
 * - "no-tabs": show header, hide tabs (old: hideTabs=true, compactHeaderOwnedByLayout=false)
 * - "minimal": hide header entirely (old: hideTabs=true, compactHeaderOwnedByLayout=true)
 */
export default function CrateHeader({
  isCompact,
  onBack,
  tabs,
  activeCrate,
  total,
  layoutMode,
}: CrateHeaderProps) {
  const hideTabs = layoutMode === "minimal" || layoutMode === "no-tabs";
  const compactOwnedByLayout = layoutMode === "compact" || layoutMode === "minimal";

  if (isCompact) {
    if (layoutMode === "minimal") {return null;}

    return (
      <div className="mb-3">
        <>
          {!compactOwnedByLayout && (
            <div className="flex items-center gap-3">
              {onBack && <IconBackButton onClick={onBack} label="store" />}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold leading-tight">
                  {activeCrate?.name}
                </h1>
                <div className="text-[11px] uppercase tracking-[0.12em] text-mc-text-dim">
                  {total === 1 ? "1 record" : `${total} records`}
                </div>
              </div>
            </div>
          )}
          {!hideTabs && (
            <div className="-mx-1 mt-2">
              <CrateTabs
                crates={tabs.crates}
                activeSlug={tabs.activeSlug}
                onSelect={tabs.onSelectCrate}
                compact
              />
            </div>
          )}
        </>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <>
        <div className="flex items-center gap-3 border-b border-mc-border pb-2 mb-3">
          {onBack && <TextBackButton onClick={onBack} label="store" />}
          {onBack && !hideTabs && <div className="w-px self-stretch bg-mc-border" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight">{activeCrate?.name}</h1>
            <div className="text-[11px] uppercase tracking-[0.12em] text-mc-text-dim">
              {total === 1 ? "1 record" : `${total} records`}
            </div>
          </div>
        </div>
        {!hideTabs && (
          <CrateTabs
            crates={tabs.crates}
            activeSlug={tabs.activeSlug}
            onSelect={tabs.onSelectCrate}
          />
        )}
      </>
    </div>
  );
}
