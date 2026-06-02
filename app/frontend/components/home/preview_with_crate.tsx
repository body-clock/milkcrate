import { PileProvider } from "@/contexts/pile_context";
import CrateView from "@/components/crate_view";
import type { WallCrate } from "@/types/inertia";
import StoreLink from "./store_link";

interface Props {
  wallCrate: WallCrate;
  storeSlug: string | null;
}

export default function PreviewWithCrate({ wallCrate, storeSlug }: Props) {
  return (
    <>
      <div className="max-w-4xl mx-auto">
        <PileProvider>
          <CrateView
            crates={[wallCrate]}
            activeSlug={wallCrate.slug}
            hideTabs
            onSelectCrate={() => {}}
          />
        </PileProvider>
      </div>
      <StoreLink storeSlug={storeSlug} />
    </>
  );
}
