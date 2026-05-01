class DailyCurationJob < ApplicationJob
  queue_as :default

  def perform(store_id = nil)
    stores = store_id ? [Store.find(store_id)] : Store.all
    stores.each { |store| curate(store) }
  end

  private

  def curate(store)
    selector = PicksSelector.new(store)
    picks = selector.select_picks(count: 12)

    # Genre bins: top 20 per genre (capped to keep page load reasonable)
    genres = store.listings.available.lp_only
      .where("cardinality(genres) > 0")
      .pluck(Arel.sql("genres[1]"))
      .uniq
      .compact

    genre_listings = genres.flat_map { |genre| selector.rank_genre(genre).first(20) }

    surfaced = (picks + genre_listings).map(&:id).uniq

    Listing.where(id: surfaced).update_all(
      last_surfaced_at: Time.current,
      surface_count: Arel.sql("surface_count + 1")
    )

    Rails.logger.info "[DailyCurationJob] store=#{store.name} surfaced=#{surfaced.size} picks=#{picks.size}"
  end
end
