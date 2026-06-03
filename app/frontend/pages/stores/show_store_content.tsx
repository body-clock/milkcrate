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

export default function ShowStoreContent({ isWide, props: p }: ShowStoreContentProps) {
  const genreCount =
    p.storefront_sections
      .filter((s): s is Extract<StorefrontSection, { crates: unknown[] }> => "crates" in s)
      .find((s) => s.key === "genre_grid")?.crates?.length ?? 0;

  return (
    <>
      {p.activeSlug === null && (
        <StoreSummary store={p.store} isWide={isWide} listingCount={p.listingCount} />
      )}
      <SyncFailedBanner store={p.store} />
      <BrowseShell
        sections={p.storefront_sections} activeSlug={p.activeSlug}
        startIndex={p.startIndex} selectCrate={p.selectCrate}
        backToStore={p.backToStore} directEntry={p.directEntry}
        crates={p.crates} listingCount={p.listingCount} genreCount={genreCount}
      />
    </>
  );
}
