import type { Crate } from "../types/inertia";
import HorizontalTabs from "./crate_tabs_horizontal";
import type { CrateTabsSharedState } from "./crate_tabs";

interface Props {
  s: CrateTabsSharedState;
  crates: Crate[];
  activeSlug: string | null;
  compact: boolean;
  onSelect: (slug: string) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (compact: boolean, selected: boolean) => string;
}

export default function CrateTabsRenderHorizontal({
  s,
  crates,
  activeSlug,
  compact,
  onSelect,
  tabIndexValue,
  classesFn,
}: Props) {
  return (
    <HorizontalTabs
      crates={crates}
      activeSlug={activeSlug}
      hasSelection={s.hasSelection}
      compact={compact}
      onSelect={onSelect}
      tabsRef={s.tabsRef}
      activeTabRef={s.activeTabRef}
      handleKeyDown={s.handleKeyDown}
      tabIndexValue={tabIndexValue}
      classesFn={classesFn}
    />
  );
}
