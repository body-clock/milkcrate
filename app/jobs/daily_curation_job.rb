class DailyCurationJob < ApplicationJob
  queue_as :default

  def perform(store_id = nil)
    stores = store_id ? [ Store.find(store_id) ] : Store.all
    stores.each { |store| curate(store) }
  end

  private

  def curate(store)
    curation = StorefrontCuration.new(store)
    surfaced = curation.surfaced_listings
    picks_count = curation.crates.find { |crate| crate.slug == "picks" }&.listings&.size || 0

    Listing.where(id: surfaced).update_all(
      last_surfaced_at: Time.current,
      surface_count: Arel.sql("surface_count + 1")
    )

    Rails.logger.info "[DailyCurationJob] store=#{store.name} surfaced=#{surfaced.size} picks=#{picks_count}"
  end
end
