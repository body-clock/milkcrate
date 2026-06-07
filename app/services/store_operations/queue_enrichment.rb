# Claims enrichment status for a store under row lock and enqueues
# EnrichmentJob without specific listing IDs (normal enrichment).
#
# Compensates on enqueue failure by restoring prior status and progress.
# Does not reset enrichment timestamps — the worker manages metadata
# lifecycle.
class StoreOperations::QueueEnrichment
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
      next Result.new(:blocked) if @store.enrichment_enriching?

      capture_and_claim
    end
  end

  def capture_and_claim
    @prior_status = @store.enrichment_status
    @prior_progress = @store.enrichment_progress_pct
    @store.update!(enrichment_status: :enriching, enrichment_progress_pct: 0)
    nil
  end

  def enqueue_or_compensate
    enqueue
  rescue StandardError
    compensate
    Result.new(:enqueue_failed)
  end

  def enqueue
    return Result.new(:queued) if EnrichmentJob.perform_later(@store.id, listing_ids: nil)

    compensate
    Result.new(:enqueue_failed)
  end

  def compensate
    @store.with_lock { restore_prior_state }
  rescue ActiveRecord::RecordNotFound
    # Store was deleted during enqueue; nothing to restore
  end

  def restore_prior_state
    return unless @store.enrichment_enriching?

    attrs = { enrichment_status: @prior_status.presence || :idle }
    attrs[:enrichment_progress_pct] = @prior_progress if @prior_progress
    @store.update!(attrs)
  end
end
