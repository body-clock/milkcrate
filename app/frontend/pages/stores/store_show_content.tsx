import BrowseShell from "@/components/browse_shell";
import { useViewport } from "@/hooks/use_viewport";
import EmptyCratesState from "@/pages/stores/empty_crates_state";
import ProcessingState from "@/pages/stores/processing_state";
import StoreSummary from "@/pages/stores/store_summary";
import SyncFailedBanner from "@/pages/stores/sync_failed_banner";
import type { StoreShowProps } from "@/types/inertia";

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

// eslint-disable-next-line max-lines-per-function
export default function StoreShowContent(props: Props) {
  const { isWide } = useViewport();
  if (props.store.sync_status === "syncing" || props.store.enrichment_status === "enriching") {
    return <ProcessingState store={props.store} />;
  }
  if (props.crates.length === 0) {
    return <EmptyCratesState />;
  }
  return (
    <>
      <StoreSummary store={props.store} isWide={isWide} listingCount={props.listingCount} />
      <SyncFailedBanner store={props.store} />
      <BrowseShell
        sections={props.storefront_sections}
        activeSlug={props.activeSlug}
        startIndex={props.startIndex}
        selectCrate={props.selectCrate}
        backToStore={props.backToStore}
        directEntry={props.directEntry}
        crates={props.crates}
        listingCount={props.listingCount}
        genreCount={
          props.storefront_sections.find((s) => s.key === "genre_grid")?.crates?.length ?? 0
        }
      />
    </>
  );
}
