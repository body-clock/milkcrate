import type { Crate } from "../types/inertia";
import WallPanelContent from "./wall_panel_content";
import WallPanelEmpty from "./wall_panel_empty";

interface Props {
  crate: Crate | null;
}

export default function WallPanel({ crate }: Props) {
  if (!crate || crate.records.length === 0) {
    return <WallPanelEmpty />;
  }

  return <WallPanelContent crate={crate} />;
}
