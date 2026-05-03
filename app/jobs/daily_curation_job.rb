class DailyCurationJob < ApplicationJob
  queue_as :default

  def perform(store_id = nil)
    stores = store_id ? [ Store.find(store_id) ] : Store.all
    stores.each { |store| curate(store) }
  end

  private

  def curate(store)
    selector = PicksSelector.new(store)
    picks = selector.select_picks(count: 12)

    # Genre bins: top 50 per genre, matching what CratePresenter displays
    genres = store.listings.available.lp_only
      .pluck(:genres)
      .map(&:first)
      .compact
      .uniq

    genre_listings = genres.flat_map { |genre| selector.rank_genre(genre).first(50) }

    surfaced = (picks + genre_listings).map(&:id).uniq

    Listing.where(id: surfaced).update_all(
      last_surfaced_at: Time.current,
      surface_count: Arel.sql("surface_count + 1")
    )

    Rails.logger.info "[DailyCurationJob] store=#{store.name} surfaced=#{surfaced.size} picks=#{picks.size}"
  end
end
