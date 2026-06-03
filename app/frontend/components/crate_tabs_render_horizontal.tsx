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

export default function CrateTabsRenderHorizontal(props: Props) {
  return (
    <HorizontalTabs
      crates={props.crates}
      activeSlug={props.activeSlug}
      hasSelection={props.s.hasSelection}
      compact={props.compact}
      onSelect={props.onSelect}
      tabsRef={props.s.tabsRef}
      activeTabRef={props.s.activeTabRef}
      handleKeyDown={props.s.handleKeyDown}
      tabIndexValue={props.tabIndexValue}
      classesFn={props.classesFn}
    />
  );
}
