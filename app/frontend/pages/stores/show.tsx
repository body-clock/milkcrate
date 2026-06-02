import AppLayout from "@/layouts/app_layout";
import { useCrateRouting } from "@/hooks/use_crate_routing";
import StoreShowContent from "@/pages/stores/store_show_content";
import type { StoreShowProps } from "@/types/inertia";

export default function StoreShow({ store, crates, storefront_sections }: StoreShowProps) {
  const rs = useCrateRouting({ crates, storefront_sections: storefront_sections ?? [] });
  const listingCount = store.total_listings ?? 0;

  return (
    <AppLayout>
      <StoreShowContent
        store={store}
        crates={crates}
        storefront_sections={storefront_sections ?? []}
        listingCount={listingCount}
        activeSlug={rs.activeSlug}
        startIndex={rs.startIndex}
        selectCrate={rs.selectCrate}
        backToStore={rs.backToStore}
        directEntry={rs.directEntry}
      />
    </AppLayout>
  );
}
