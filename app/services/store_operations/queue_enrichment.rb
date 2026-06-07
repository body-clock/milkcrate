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

    @store.with_lock do
      return Result.new(:blocked) if @store.enrichment_enriching?

      @prior_status = @store.enrichment_status
      @prior_progress = @store.enrichment_progress_pct

      @store.update!(enrichment_status: :enriching, enrichment_progress_pct: 0)
    end

    enqueue_or_compensate
  rescue ActiveRecord::RecordNotFound
    Result.new(:missing)
  end

  private

  def enqueue_or_compensate
    job = EnrichmentJob.perform_later(@store.id, listing_ids: nil)
    return Result.new(:queued) if job

    compensate
    Result.new(:enqueue_failed)
  rescue StandardError
    compensate
    Result.new(:enqueue_failed)
  end

  def compensate
    @store.with_lock do
      return unless @store.enrichment_enriching?

      attrs = { enrichment_status: @prior_status.presence || :idle }
      attrs[:enrichment_progress_pct] = @prior_progress if @prior_progress
      @store.update!(attrs)
    end
  rescue ActiveRecord::RecordNotFound
    # Store was deleted during enqueue; nothing to restore
  end
end
