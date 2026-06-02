import { motion } from "framer-motion";
import AppLayout from "@/layouts/app_layout";
import BrowseShell from "@/components/browse_shell";
import Spinner from "@/components/spinner";
import FeedbackMessage from "@/components/ui/feedback_message";
import { useCrateRouting } from "@/hooks/use_crate_routing";
import type { StoreShowProps } from "@/types/inertia";

export default function StoreShow({ store, crates, storefront_sections }: StoreShowProps) {
  const { activeSlug, startIndex, selectCrate, backToStore } = useCrateRouting({
    crates,
    storefront_sections: storefront_sections ?? [],
  });
  const listingCount = store.total_listings ?? 0;

  return (
    <AppLayout>
      <StoreShowContent
        store={store}
        crates={crates}
        storefront_sections={storefront_sections ?? []}
        listingCount={listingCount}
        activeSlug={activeSlug}
        startIndex={startIndex}
        selectCrate={selectCrate}
        backToStore={backToStore}
      />
    </AppLayout>
  );
}

interface StoreShowContentProps {
  store: StoreShowProps["store"];
  crates: StoreShowProps["crates"];
  storefront_sections: NonNullable<StoreShowProps["storefront_sections"]>;
  listingCount: number;
  activeSlug: string | null;
  startIndex: number;
  selectCrate: (slug: string, startIndex?: number) => void;
  backToStore: () => void;
}

function StoreShowContent({
  store,
  crates,
  storefront_sections,
  listingCount,
  activeSlug,
  startIndex,
  selectCrate,
  backToStore,
}: StoreShowContentProps) {
  const hasStoreSummary = Boolean(store.description) || listingCount > 0;

  return (
    <>
      {activeSlug === null && hasStoreSummary ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6"
        >
          {store.description && (
            <p className="text-sm text-mc-text leading-relaxed max-w-prose">{store.description}</p>
          )}
          {listingCount > 0 ? (
            <p className="text-xs text-mc-text-dim mt-1.5">
              {listingCount.toLocaleString()} vinyl listings
            </p>
          ) : null}
        </motion.div>
      ) : null}

      {store.sync_status === "failed" && (
        <FeedbackMessage tone="danger" live="assertive" className="mb-6 px-4 py-3">
          <p className="text-sm font-medium">
            Sync failed
            {store.last_sync_error_at
              ? ` on ${new Date(store.last_sync_error_at).toLocaleString()}`
              : ""}
          </p>
          <p className="text-xs text-mc-text-dim mt-1">
            Inventory may be out of date. The store owner has been notified.
          </p>
        </FeedbackMessage>
      )}

      {store.sync_status === "syncing" || store.enrichment_status === "enriching" ? (
        <FeedbackMessage
          tone="progress"
          live="polite"
          className="border-0 bg-transparent py-16 text-center"
        >
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-sm">
            {store.sync_status === "syncing"
              ? "Syncing inventory… check back in a moment."
              : "Setting up your store… check back in a moment."}
          </p>
        </FeedbackMessage>
      ) : crates.length === 0 ? (
        <div className="py-16 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">
            🎵
          </span>
          <p className="text-sm text-mc-text-dim">
            No vinyl found yet. Once the store syncs, browsable crates will appear here.
          </p>
        </div>
      ) : (
        <BrowseShell
          sections={storefront_sections}
          activeSlug={activeSlug}
          startIndex={startIndex}
          selectCrate={selectCrate}
          backToStore={backToStore}
        />
      )}
    </>
  );
}
