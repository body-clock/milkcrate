import { IconBackButton } from "../../back_button";
import CrateTabs from "../../crate_tabs";
import type { CrateTabState } from "./types";
import { CrateHeaderInfo } from "./crate_header_info";
import type { Crate } from "../../../types/inertia";

interface Props {
  onBack?: () => void;
  tabs: CrateTabState;
  activeCrate: Crate | undefined;
  total: number;
  showOwnHeader: boolean;
  hideTabs: boolean;
}

export function CompactCrateHeader({
  onBack, tabs, activeCrate, total, showOwnHeader, hideTabs,
}: Props) {
  return (
    <div className="mb-3">
      {showOwnHeader && (
        <div className="flex items-center gap-3">
          {onBack && <IconBackButton onClick={onBack} label="store" />}
          <CrateHeaderInfo activeCrate={activeCrate} total={total} />
        </div>
      )}
      {!hideTabs && (
        <div className="-mx-1 mt-2">
          <CrateTabs crates={tabs.crates} activeSlug={tabs.activeSlug} onSelect={tabs.onSelectCrate} compact />
        </div>
      )}
    </div>
  );
}
