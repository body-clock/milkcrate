# Public-facing explore page listing all record stores.
class ExploreController < ApplicationController
  layout "inertia_application"

  FEATURED_COUNT = 3
  EXPLORE_CACHE_TTL = 24.hours
  EXPLORE_CACHE_KEY = "explore/v1/%<date>s/%<store_count>s"

  def index
    set_explore_seo
    render inertia: "explore", props: { stores: cached_stores_data, featured_stores: cached_featured_data, copy: t("pages.explore").to_h, error: nil }
  rescue ActiveRecord::QueryCanceled, ActiveRecord::ConnectionNotEstablished, ActiveRecord::StatementInvalid => e
    Rails.logger.warn("[ExploreController] Query failed: #{e.message}")
    render_explore_error
  end

  private

  def set_explore_seo
    @page_seo = I18n.t("pages.seo.explore").merge(head_html: explore_json_ld_html)
  end

  def explore_json_ld_html
    %(<script type="application/ld+json">#{seo_explore_json_ld(cached_stores_data)}</script>)
  end

  def render_explore_error
    @page_seo = I18n.t("pages.seo.explore")
    render inertia: "explore", props: { stores: [], featured_stores: [], copy: t("pages.explore").to_h, error: "We couldn't load the store directory right now. Please try again shortly." }
  end

  def cached_stores_data
    Rails.cache.fetch(explore_cache_key, expires_in: EXPLORE_CACHE_TTL) { build_stores_data }
  end

  def cached_featured_data
    Rails.cache.fetch(featured_cache_key, expires_in: EXPLORE_CACHE_TTL) { build_featured_data }
  end

  def build_stores_data
    ready_stores.order(:name).map { |store| store_props(store) }
  end

  def build_featured_data
    all_ready = ready_stores.to_a
    return [] if all_ready.empty?

    count = [ FEATURED_COUNT, all_ready.length ].min
    all_ready.sample(count).map { |store| store_props(store) }
  end

  def store_props(store)
    {
      id: store.id,
      name: store.name,
      discogs_username: store.discogs_username,
      total_listings: store.total_listings,
      avatar_url: store.avatar_url,
      location: store.location,
      genre_tags: store.genre_tags,
      description: store.description
    }
  end

  def ready_stores
    @ready_stores ||= Store.ready
  end

  def explore_cache_key
    store_count = Store.ready.count
    EXPLORE_CACHE_KEY % { date: Date.current.iso8601, store_count: }
  end

  def featured_cache_key
    "explore/featured/v1/#{Date.current.iso8601}"
  end
end
