import type { Crate } from "../types/inertia";
import PanelContent from "./crate_browse_panel_content";

export type CrateBrowseMode = "featured" | "genres";

export interface CrateBrowsePanelConfig {
  title: string;
  description: string;
  ariaLabel: string;
  emptyText: string;
}

interface Props {
  config: CrateBrowsePanelConfig;
  crates: Crate[];
  activeSlug: string | null;
  startIndex: number;
  onSelectCrate: (slug: string, startIndex?: number) => void;
  /** When true, the CrateChipBar is rendered externally (e.g. in a sidebar). */
  hideChipBar?: boolean;
}

export default function CrateBrowsePanel(props: Props) {
  return (
    <section
      role="region"
      aria-label={props.config.ariaLabel}
      className="space-y-4"
    >
      <PanelContent {...props} hideChipBar={props.hideChipBar ?? false} />
    </section>
  );
}
