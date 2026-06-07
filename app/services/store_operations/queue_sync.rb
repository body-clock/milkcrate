# Claims sync status for a store under row lock and enqueues FullStoreSyncJob.
#
# Compensates on enqueue failure by restoring prior status and progress.
# Handles the missing-store case when the record is deleted between
# controller loading and row lock acquisition.
#
# Rake tasks and recurring jobs continue enqueuing jobs directly without
# going through this request object.
class StoreOperations::QueueSync
  Result = Data.define(:outcome) # :queued, :blocked, :missing, :enqueue_failed

  def self.call(store) = new(store).call

  def initialize(store)
    @store = store
    @prior_status = nil
    @prior_progress = nil
  end

  def call
    return Result.new(:missing) if @store.nil?

    @store.with_lock do
      return Result.new(:blocked) if @store.sync_syncing?

      @prior_status = @store.sync_status
      @prior_progress = @store.sync_progress_pct

      @store.update!(sync_status: :syncing, sync_progress_pct: 0)
    end

    enqueue_or_compensate
  rescue ActiveRecord::RecordNotFound
    Result.new(:missing)
  end

  private

  def enqueue_or_compensate
    job = FullStoreSyncJob.perform_later(@store.id)
    return Result.new(:queued) if job

    compensate
    Result.new(:enqueue_failed)
  rescue StandardError
    compensate
    Result.new(:enqueue_failed)
  end

  def compensate
    @store.with_lock do
      return unless @store.sync_syncing?

      attrs = { sync_status: @prior_status.presence || :idle }
      attrs[:sync_progress_pct] = @prior_progress if @prior_progress
      @store.update!(attrs)
    end
  rescue ActiveRecord::RecordNotFound
    # Store was deleted during enqueue; nothing to restore
  end
end
