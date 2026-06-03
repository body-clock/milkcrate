import { useViewport } from "@/hooks/use_viewport";
import EmptyCratesState from "@/pages/stores/empty_crates_state";
import ProcessingState from "@/pages/stores/processing_state";
import SyncFailedBanner from "@/pages/stores/sync_failed_banner";
import type { StoreShowProps } from "@/types/inertia";

import ShowStoreContent from "./show_store_content";

interface Props {
  store: StoreShowProps["store"];
  crates: StoreShowProps["crates"];
  storefront_sections: NonNullable<StoreShowProps["storefront_sections"]>;
  listingCount: number;
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
  directEntry: boolean;
}

export default function StoreShowContent(props: Props) {
  const { isWide } = useViewport();
  if (props.store.sync_status === "syncing" || props.store.enrichment_status === "enriching") {
    return <ProcessingState store={props.store} />;
  }
  if (props.crates.length === 0) {
    return (
      <>
        <SyncFailedBanner store={props.store} />
        <EmptyCratesState />
      </>
    );
  }
  return <ShowStoreContent isWide={isWide} props={props} />;
}
