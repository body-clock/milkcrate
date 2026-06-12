# Scheduled job that enqueues EnrichmentJob for stores that need it.
# Runs nightly after all syncs complete — decoupled from sync to avoid
# enrichment hogging the limited API budget while stores wait to sync.
class EnrichmentSweepJob < ApplicationJob
  queue_as :default

  def perform
    stores_to_enrich.find_each do |store|
      EnrichmentJob.perform_later(store.id)
    end
  end

  private

  def stores_to_enrich
    Store.where(enrichment_status: "idle")
         .where("last_enriched_at IS NULL OR last_enriched_at < last_synced_at")
  end
end
