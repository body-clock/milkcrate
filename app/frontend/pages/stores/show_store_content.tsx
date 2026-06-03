import BrowseShell from "@/components/browse_shell";
import StoreSummary from "@/pages/stores/store_summary";
import SyncFailedBanner from "@/pages/stores/sync_failed_banner";
import type { StorefrontSection, StoreShowProps } from "@/types/inertia";

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

interface ShowStoreContentProps {
  isWide: boolean;
  props: Props;
}

export default function ShowStoreContent({ isWide, props }: ShowStoreContentProps) {
  return (
    <>
      <StoreSummary store={props.store} isWide={isWide} listingCount={props.listingCount} />
      <SyncFailedBanner store={props.store} />
      <BrowseShell
        sections={props.storefront_sections} activeSlug={props.activeSlug}
        startIndex={props.startIndex} selectCrate={props.selectCrate}
        backToStore={props.backToStore} directEntry={props.directEntry}
        crates={props.crates} listingCount={props.listingCount}
        genreCount={
          props.storefront_sections
            .filter((s): s is Extract<StorefrontSection, { crates: unknown[] }> => "crates" in s)
            .find((s) => s.key === "genre_grid")?.crates?.length ?? 0
        }
      />
    </>
  );
}
