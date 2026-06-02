import { TextBackButton } from "../../back_button";
import CrateTabs from "../../crate_tabs";
import type { CrateTabState } from "./types";
import { CrateHeaderInfo } from "./crate_header_info";
import type { Crate } from "../../../types/inertia";

interface Props {
  onBack?: () => void;
  tabs: CrateTabState;
  activeCrate: Crate | undefined;
  total: number;
  hideTabs: boolean;
}

export function WideCrateHeader({
  onBack, tabs, activeCrate, total, hideTabs,
}: Props) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 border-b border-mc-border pb-2 mb-3">
        {onBack && <TextBackButton onClick={onBack} label="store" />}
        {onBack && !hideTabs && <div className="w-px self-stretch bg-mc-border" />}
        <CrateHeaderInfo activeCrate={activeCrate} total={total} />
      </div>
      {!hideTabs && <CrateTabs crates={tabs.crates} activeSlug={tabs.activeSlug} onSelect={tabs.onSelectCrate} />}
    </div>
  );
}
