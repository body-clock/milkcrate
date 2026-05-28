import { motion } from "framer-motion";
import AppLayout from "@/layouts/app_layout";
import CrateView from "@/components/crate_view";
import StoreFloor from "@/components/store_floor";
import Spinner from "@/components/spinner";
import FeedbackMessage from "@/components/ui/feedback_message";
import { useCrateRouting } from "@/hooks/use_crate_routing";
import type { StoreShowProps } from "@/types/inertia";

export default function StoreShow({ store, crates, storefront_sections }: StoreShowProps) {
  const { activeSlug, activeCrate, startIndex, selectCrate, allCrates } = useCrateRouting({
    crates,
    storefront_sections: storefront_sections ?? [],
  });

  return (
    <AppLayout
      compactLocation={
        activeCrate
          ? {
              name: activeCrate.name,
              count: activeCrate.records.length,
              onBack: () => history.back(),
            }
          : undefined
      }
    >
      {activeSlug === null && (store.description || store.total_listings) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-6"
        >
          {store.description && (
            <p className="text-sm text-mc-text leading-relaxed max-w-prose">{store.description}</p>
          )}
          {store.total_listings && (
            <p className="text-xs text-mc-text-dim mt-1.5">
              {store.total_listings.toLocaleString()} vinyl listings
            </p>
          )}
        </motion.div>
      )}

      {store.sync_status === "failed" && (
        <FeedbackMessage tone="danger" live="assertive" className="mb-6 px-4 py-3">
          <p className="text-sm font-medium">
            Sync failed
            {store.last_sync_error_at
              ? ` on ${new Date(store.last_sync_error_at).toLocaleString()}`
              : ""}
          </p>
          <p className="text-xs text-mc-text-dim mt-1">
            Inventory may be stale. Try running the sync again from the Rails console.
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
            No vinyl found yet. Once the store syncs, curated crates will appear here.
          </p>
        </div>
      ) : activeSlug === null ? (
        <StoreFloor sections={storefront_sections ?? []} onSelectCrate={selectCrate} />
      ) : (
        <CrateView
          crates={allCrates}
          activeSlug={activeSlug}
          startIndex={startIndex}
          compactHeaderOwnedByLayout
          onSelectCrate={selectCrate}
          onBack={() => history.back()}
        />
      )}
    </AppLayout>
  );
}
