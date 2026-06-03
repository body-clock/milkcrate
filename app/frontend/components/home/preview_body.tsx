import type { WallCrate } from "@/types/inertia";

import PreviewFallback from "./preview_fallback";
import PreviewWithCrate from "./preview_with_crate";

interface Props {
  wallCrate: WallCrate | undefined;
  storeSlug: string | null;
}

export default function PreviewBody({ wallCrate, storeSlug }: Props) {
  if (wallCrate && wallCrate.records.length > 0) {
    return <PreviewWithCrate wallCrate={wallCrate} storeSlug={storeSlug} />;
  }
  return <PreviewFallback />;
}
