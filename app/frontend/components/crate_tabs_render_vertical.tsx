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

export default function CrateTabsRenderVertical(props: Props) {
  return (
    <VerticalTabs
      crates={props.crates}
      activeSlug={props.activeSlug}
      hasSelection={props.s.hasSelection}
      onSelect={props.onSelect}
      tabsRef={props.s.tabsRef}
      activeTabRef={props.s.activeTabRef}
      handleKeyDown={props.s.handleKeyDown}
      tabIndexValue={props.tabIndexValue}
      classesFn={props.classesFn}
    />
  );
}
