import type { Crate } from "../../../types/inertia";
import { IconBackButton } from "../../back_button";
import CrateTabs from "../../crate_tabs";
import { CrateHeaderInfo } from "./crate_header_info";
import type { CrateTabState } from "./types";

interface Props {
  onBack?: () => void;
  tabs: CrateTabState;
  activeCrate: Crate | undefined;
  total: number;
  showOwnHeader: boolean;
  hideTabs: boolean;
}

function renderOwnHeader(
  onBack: (() => void) | undefined,
  activeCrate: Crate | undefined,
  total: number,
) {
  return (
    <div className="flex items-center gap-3">
      {onBack && <IconBackButton onClick={onBack} label="store" />}
      <CrateHeaderInfo activeCrate={activeCrate} total={total} />
    </div>
  );
}

function renderTabsDiv(tabs: CrateTabState, hideTabs: boolean) {
  if (hideTabs) {
    return null;
  }
  return (
    <div className="-mx-1 mt-2">
      <CrateTabs
        crates={tabs.crates}
        activeSlug={tabs.activeSlug}
        onSelect={tabs.onSelectCrate}
        compact
      />
    </div>
  );
}

export function CompactCrateHeader({
  onBack,
  tabs,
  activeCrate,
  total,
  showOwnHeader,
  hideTabs,
}: Props) {
  return (
    <div className="mb-3">
      {showOwnHeader && renderOwnHeader(onBack, activeCrate, total)}
      {renderTabsDiv(tabs, hideTabs)}
    </div>
  );
}
