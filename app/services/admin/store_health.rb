# Namespace for admin controllers and presenters.
module Admin
  class StoreHealth
    STALE_AFTER = 23.hours

    def initialize(store)
      @store = store
    end

    def props
      if failed?
        health_props("failed", "Needs attention", "danger", failure_reasons)
      elsif processing?
        health_props("processing", "Processing", "working", processing_reasons)
      elsif missing_readiness?
        health_props("processing", "Processing", "working", readiness_reasons)
      elsif stale?
        health_props("stale", "Stale", "warning", stale_reasons)
      elsif partial?
        health_props("partial", "Partial coverage", "warning", [ "Inventory coverage is partial" ])
      else
        health_props("healthy", "Healthy", "good", [ "Sync and enrichment are current" ])
      end
    end

    private

    attr_reader :store

    def health_props(key, label, severity, reasons)
      {
        key:,
        label:,
        severity:,
        reasons: reasons.compact_blank,
        has_sync_error: store.last_sync_error_at.present?,
        last_sync_error_summary: sync_error_summary
      }
    end

    def failed?
      store.sync_failed? || store.enrichment_failed?
    end

    def failure_reasons
      [
        ("Sync failed" if store.sync_failed?),
        ("Enrichment failed" if store.enrichment_failed?)
      ]
    end

    def processing?
      store.sync_syncing? || store.enrichment_enriching?
    end

    def processing_reasons
      [
        ("Sync in progress" if store.sync_syncing?),
        ("Enrichment in progress" if store.enrichment_enriching?)
      ]
    end

    def missing_readiness?
      store.last_synced_at.blank? || store.last_enriched_at.blank?
    end

    def readiness_reasons
      [
        ("Waiting on first sync" if store.last_synced_at.blank?),
        ("Waiting on first enrichment" if store.last_enriched_at.blank?)
      ]
    end

    def stale?
      stale_time?(store.last_synced_at) || stale_time?(store.last_enriched_at)
    end

    def stale_reasons
      [
        ("Sync is stale" if stale_time?(store.last_synced_at)),
        ("Enrichment is stale" if stale_time?(store.last_enriched_at))
      ]
    end

    def stale_time?(time)
      time.present? && time < STALE_AFTER.ago
    end

    def partial?
      store.catalog_coverage == "partial"
    end

    def sync_error_summary
      store.last_sync_error.to_s.lines.first&.strip.presence
    end
  end
end
