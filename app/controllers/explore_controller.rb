# Public-facing explore page listing all record stores.
class ExploreController < ApplicationController
  layout "inertia_application"

  FEATURED_COUNT = 3

  def index
    set_explore_seo
    render inertia: "explore", props: { stores: stores_data, featured_stores: featured_stores_data, error: nil }
  rescue ActiveRecord::QueryCanceled, ActiveRecord::ConnectionNotEstablished, ActiveRecord::StatementInvalid => e
    Rails.logger.warn("[ExploreController] Query failed: #{e.message}")
    render_explore_error
  end

  private

  def set_explore_seo
    @page_seo = I18n.t("pages.seo.explore").merge(head_html: explore_json_ld_html)
  end

  def explore_json_ld_html
    stores = stores_data
    %(<script type="application/ld+json">#{seo_explore_json_ld(stores)}</script>)
  end

  def render_explore_error
    @page_seo = I18n.t("pages.seo.explore")
    render inertia: "explore", props: { stores: [], featured_stores: [], error: "We couldn't load the store directory right now. Please try again shortly." }
  end

  def stores_data
    ready_stores.order(:name).map do |store|
      store_props(store)
    end
  end

  def featured_stores_data
    return [] if ready_stores.count < 1

    count = [ FEATURED_COUNT, ready_stores.count ].min
    ready_stores.order(Arel.sql("RANDOM() + #{daily_seed}")).limit(count).map do |store|
      store_props(store)
    end
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

  def daily_seed
    Date.current.jd.to_f / 1000
  end
end
