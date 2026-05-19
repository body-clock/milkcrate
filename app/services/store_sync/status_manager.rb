class StoreSync::StatusManager
  STALE_THRESHOLD = 23.hours

  def initialize(store)
    @store = store
  end

  def stale?
    @store.last_synced_at.nil? || @store.last_synced_at < STALE_THRESHOLD.ago
  end

  def mark_succeeded!(attributes = {})
    @store.update!(
      {
        sync_status: "idle",
        last_sync_error: nil,
        last_sync_error_at: nil
      }.merge(attributes)
    )
  end

  def mark_failed!(error)
    @store.update!(
      sync_status: "failed",
      last_sync_error: summarized_error(error),
      last_sync_error_at: Time.current
    )
  end

  private

  def summarized_error(error)
    summary = "#{error.class}: #{error.message}"
    backtrace = Array(error.backtrace).first(8)

    ([ summary ] + backtrace).join("\n")
  end
end
