import type { Crate } from "../types/inertia";
import VerticalTabs from "./crate_tabs_vertical";
import type { CrateTabsSharedState } from "./crate_tabs";

interface Props {
  s: CrateTabsSharedState;
  crates: Crate[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  tabIndexValue: (selected: boolean, hasSelection: boolean, i: number) => number;
  classesFn: (selected: boolean) => string;
}

export default function CrateTabsRenderVertical({
  s,
  crates,
  activeSlug,
  onSelect,
  tabIndexValue,
  classesFn,
}: Props) {
  return (
    <VerticalTabs
      crates={crates}
      activeSlug={activeSlug}
      hasSelection={s.hasSelection}
      onSelect={onSelect}
      tabsRef={s.tabsRef}
      activeTabRef={s.activeTabRef}
      handleKeyDown={s.handleKeyDown}
      tabIndexValue={tabIndexValue}
      classesFn={classesFn}
    />
  );
}
