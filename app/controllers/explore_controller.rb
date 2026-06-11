# Public-facing explore page listing all record stores.
class ExploreController < ApplicationController
  layout "inertia_application"

  def index
    render inertia: "explore", props: {
      stores: stores_data,
      error: nil
    }
  rescue ActiveRecord::QueryCanceled, ActiveRecord::ConnectionNotEstablished, ActiveRecord::StatementInvalid => e
    Rails.logger.warn("[ExploreController] Query failed: #{e.message}")
    render inertia: "explore", props: {
      stores: [],
      error: "We couldn't load the store directory right now. Please try again shortly."
    }
  end

  private

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
