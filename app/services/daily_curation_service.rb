class DailyCurationService
  def curate(store)
    started_at = Time.current
    artifact = nil

    artifact = StorefrontSnapshotBuilder.call(
      store: store,
      curation: StorefrontCuration.new(store),
      props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION
    )

    snapshot = nil
    Store.transaction do
      store.storefront_snapshots.active.update_all(active: false)

      snapshot = store.storefront_snapshots.create!(
        curation_date: Date.current,
        status: "ready",
        active: true,
        props_schema_version: artifact.props_schema_version,
        crates: artifact.crates,
        storefront_sections: artifact.storefront_sections,
        surfaced_listing_ids: artifact.surfaced_listing_ids,
        generated_at: artifact.generated_at,
        metrics: artifact.metrics.merge(duration_ms: elapsed_ms(started_at))
      )

      Listing.where(id: artifact.surfaced_listing_ids).update_all(
        last_surfaced_at: Time.current,
        surface_count: Arel.sql("surface_count + 1")
      )
    end

    log_success(store:, snapshot:)
    snapshot
  rescue StandardError => error
    snapshot = store.storefront_snapshots.create!(
      curation_date: Date.current,
      status: "failed",
      active: false,
      props_schema_version: StorefrontSnapshot::CURRENT_PROPS_SCHEMA_VERSION,
      crates: [],
      storefront_sections: [],
      surfaced_listing_ids: [],
      failed_at: Time.current,
      failure_message: summarized_failure_error(error),
      metrics: failure_metrics(artifact, started_at)
    )

    log_failure(store:, snapshot:, error:)
    snapshot
  end

  private

  def elapsed_ms(started_at)
    ((Time.current - started_at) * 1000).round
  end

  def failure_metrics(artifact, started_at)
    metrics = artifact&.metrics&.with_indifferent_access || {}

    metrics.merge(
      duration_ms: elapsed_ms(started_at),
      crate_count: metrics[:crate_count] || 0,
      record_count: metrics[:record_count] || 0,
      surfaced_count: metrics[:surfaced_count] || 0,
      payload_bytes: metrics[:payload_bytes] || 0
    )
  end

  def summarized_failure_error(error)
    summary = "#{error.class}: #{error.message}"
    backtrace = Array(error.backtrace).first(8)

    ([ summary ] + backtrace).join("\n")
  end

  def log_success(store:, snapshot:)
    metrics = snapshot.metrics.with_indifferent_access

    Rails.logger.info(
      "[DailyCurationService] store_id=#{store.id} store=#{store.name} status=ready " \
      "schema_version=#{snapshot.props_schema_version} crate_count=#{metrics[:crate_count]} " \
      "record_count=#{metrics[:record_count]} surfaced_count=#{metrics[:surfaced_count]} " \
      "duration_ms=#{metrics[:duration_ms]} payload_bytes=#{metrics[:payload_bytes]}"
    )
  end

  def log_failure(store:, snapshot:, error:)
    metrics = snapshot.metrics.with_indifferent_access

    Rails.logger.warn(
      "[DailyCurationService] store_id=#{store.id} store=#{store.name} status=failed " \
      "schema_version=#{snapshot.props_schema_version} crate_count=#{metrics[:crate_count]} " \
      "record_count=#{metrics[:record_count]} surfaced_count=#{metrics[:surfaced_count]} " \
      "duration_ms=#{metrics[:duration_ms]} payload_bytes=#{metrics[:payload_bytes]} " \
      "error=#{error.class}: #{error.message}"
    )
  end
end
