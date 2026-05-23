# Serializes store owner dashboard data (store info, error summaries) for Inertia views.
class DashboardPresenter
  def initialize(store)
    @store = store
  end

  def props
    {
      store: {
        id: @store.id,
        name: @store.name,
        discogs_username: @store.discogs_username,
        storefront_url: store_path(@store.discogs_username),
        total_listings: @store.total_listings,
        sync_status: @store.sync_status,
        last_synced_at: @store.last_synced_at,
        last_sync_error_summary: sync_error_summary,
        last_sync_error_at: @store.last_sync_error_at,
        owner_email: @store.store_owner&.owner_email,
        oauth_authorized_at: @store.oauth_authorized_at
      }
    }
  end

  private

  def store_path(username)
    "/#{username}"
  end

  def sync_error_summary
    summary = @store.last_sync_error.to_s.lines.first&.strip
    return nil if summary.blank?

    summary.sub(/\A[^:]+:\s*/, "")
  end
end
