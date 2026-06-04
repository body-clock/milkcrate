import type { Crate } from "../types/inertia";
import CrateEmptyState from "./crate_view/crate_empty_state";
import CrateHeader from "./crate_view/crate_header";
import CrateViewContent from "./crate_view/crate_view_content";
import { useCrateViewData } from "./crate_view/use_crate_view_data";

interface Props {
  crates: Crate[];
  activeSlug: string;
  startIndex?: number;
  hideTabs?: boolean;
  compactHeaderOwnedByLayout?: boolean;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  onBack?: () => void;
}

/**
 * Orchestrates the crate browsing view: header, card stack with drag
 * navigation, progress indicator, and desktop sidebar details.
 */
export default function CrateView({
  crates, activeSlug, startIndex = 0, hideTabs = false,
  compactHeaderOwnedByLayout = false, onSelectCrate, onBack,
}: Props) {
  const data = useCrateViewData({ crates, activeSlug, startIndex,
    hideTabs, compactHeaderOwnedByLayout });
  const header = (
    <CrateHeader isCompact={data.isCompact} onBack={onBack}
      tabs={{ crates, activeSlug, onSelectCrate }}
      activeCrate={data.activeCrate} total={data.total} layoutMode={data.layoutMode} />
  );
  if (!data.activeCrate || data.total === 0) { return <CrateEmptyState header={header} />; }
  return <CrateViewContent header={header} {...data} />;
}
