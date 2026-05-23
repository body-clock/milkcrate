# Manages the enrichment status lifecycle for a store (idle, enriching, failed).
class StoreEnrichment::StatusManager
  def initialize(store)
    @store = store
  end

  def mark_started!
    @store.update!(enrichment_status: "enriching")
  end

  def mark_succeeded!(finished_at: Time.current)
    @store.update!(enrichment_status: "idle", last_enriched_at: finished_at)
  end

  def mark_failed!
    @store.update!(enrichment_status: "failed")
  end
end
