# Permanently removes one inactive store, its dependents, and an orphaned owner.
#
# Gates:
# - Store must exist
# - Sync and enrichment must both be idle
# - Confirmation must exactly match the persisted discogs_username
#
# Transaction scope:
# 1. Lock store via with_lock (opens transaction + acquires row lock)
# 2. Lock associated owner row inside the same transaction
# 3. Destroy store (cascades to listings and discogs_order_events via
#    dependent: :destroy)
# 4. Destroy owner only when no remaining stores reference it
# 5. Roll back everything on any failure
class StoreOperations::DeleteStore
  Result = Data.define(:outcome) # :deleted, :mismatch, :active, :missing, :failed

  def self.call(store_id, confirmation:) = new(store_id, confirmation:).call

  def initialize(store_id, confirmation:)
    @store_id = store_id
    @confirmation = confirmation
  end

  def call
    store = Store.find_by(id: @store_id)
    return Result.new(:missing) unless store

    delete_or_reject(store) || Result.new(:deleted)
  rescue ActiveRecord::RecordNotDestroyed, ActiveRecord::RecordInvalid
    Result.new(:failed)
  end

  private

  def delete_or_reject(store)
    store.with_lock do
      next Result.new(:active) if store.sync_syncing? || store.enrichment_enriching?
      next Result.new(:mismatch) unless store.discogs_username == @confirmation
      destroy_store_and_owner(store); nil
    end
  end

  def destroy_store_and_owner(store)
    owner = store.store_owner
    owner&.lock!
    store.destroy!
    owner&.destroy! if owner && owner.stores.reload.empty?
  end
end
