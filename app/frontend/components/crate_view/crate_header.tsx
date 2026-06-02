import type { CrateHeaderProps } from "./crate_header/types";
import { CompactCrateHeader } from "./crate_header/compact_crate_header";
import { WideCrateHeader } from "./crate_header/wide_crate_header";

/**
 * Shared header for crate views — handles both compact and desktop layouts.
 * `layoutMode`: "full" | "compact" | "no-tabs" | "minimal"
 */
export default function CrateHeader({
  isCompact, onBack, tabs, activeCrate, total, layoutMode,
}: CrateHeaderProps) {
  if (layoutMode === "minimal") {return null;}
  const hideTabs = layoutMode === "no-tabs";
  const showOwnHeader = layoutMode !== "compact" && layoutMode !== "minimal";

  return isCompact
    ? <CompactCrateHeader onBack={onBack} tabs={tabs} activeCrate={activeCrate} total={total} showOwnHeader={showOwnHeader} hideTabs={hideTabs} />
    : <WideCrateHeader onBack={onBack} tabs={tabs} activeCrate={activeCrate} total={total} hideTabs={hideTabs} />;
}
