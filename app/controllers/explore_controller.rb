# Public-facing explore page listing all record stores.
class ExploreController < ApplicationController
  layout "inertia_application"

  def index
    set_explore_seo
    render inertia: "explore", props: { stores: stores_data, error: nil }
  rescue ActiveRecord::QueryCanceled, ActiveRecord::ConnectionNotEstablished, ActiveRecord::StatementInvalid => e
    Rails.logger.warn("[ExploreController] Query failed: #{e.message}")
    render_explore_error
  end

  private

  def set_explore_seo
    @page_seo = I18n.t("pages.seo.explore")
  end

  def render_explore_error
    set_explore_seo
    render inertia: "explore", props: { stores: [], error: "We couldn't load the store directory right now. Please try again shortly." }
  end

  def stores_data
    Store.order(:name)
      .select(:id, :name, :discogs_username, :total_listings)
      .map do |store|
        {
          id: store.id,
          name: store.name,
          discogs_username: store.discogs_username,
          total_listings: store.total_listings
        }
      end
  end
end
