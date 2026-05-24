# Tracks page-level sync progress and persists to the store record.
# Duck-types to support InventoryFetcher's @progress interface (.total=, .increment).
class StoreSync::ProgressTracker
  def initialize(store)
    @store = store
    @current = 0
    @total = 0
  end

  def total=(value)
    @total = value
    update!
  end

  def increment
    @current += 1
    update!
  end

  private

  def update!
    pct = @total > 0 ? (@current.to_f / @total * 100).round : 0
    @store.update_columns(sync_progress_pct: pct.clamp(0, 100))
  end
end
