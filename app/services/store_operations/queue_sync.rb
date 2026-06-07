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

    claim_store || enqueue_or_compensate
  rescue ActiveRecord::RecordNotFound
    Result.new(:missing)
  end

  private

  def claim_store
    @store.with_lock do
      next Result.new(:blocked) if @store.sync_syncing?

      capture_and_claim
    end
  end

  def capture_and_claim
    @prior_status = @store.sync_status
    @prior_progress = @store.sync_progress_pct
    @store.update!(sync_status: :syncing, sync_progress_pct: 0)
    nil
  end

  def enqueue_or_compensate
    enqueue
  rescue StandardError
    compensate
    Result.new(:enqueue_failed)
  end

  def enqueue
    return Result.new(:queued) if FullStoreSyncJob.perform_later(@store.id)

    compensate
    Result.new(:enqueue_failed)
  end

  def compensate
    @store.with_lock { restore_prior_state }
  rescue ActiveRecord::RecordNotFound
    # Store was deleted during enqueue; nothing to restore
  end

  def restore_prior_state
    return unless @store.sync_syncing?

    attrs = { sync_status: @prior_status.presence || :idle }
    attrs[:sync_progress_pct] = @prior_progress if @prior_progress
    @store.update!(attrs)
  end
end
