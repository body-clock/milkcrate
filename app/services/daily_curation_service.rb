# Orchestrates daily curation for a store: surfaces listings and pre-warms the storefront cache.
class DailyCurationService
  def curate(store)
    curation = StorefrontCuration.new(store)
    surfaced = curation.surfaced_listings
    update_surface_timestamps(surfaced)
    prewarm_cache(store, curation)
    log_curation(store, surfaced, curation)
  end

  private

  def log_curation(store, surfaced, curation)
    wall_count = wall_crate_count(curation)
    Rails.logger.info "[DailyCurationJob] store=#{store.name} surfaced=#{surfaced.size} wall=#{wall_count}"
  end

  def wall_crate_count(curation)
    curation.crates.find { |crate| crate.slug == "wall" }&.listings&.size || 0
  end

  def update_surface_timestamps(surfaced)
    Listing.where(id: surfaced).update_all(
      last_surfaced_at: Time.current,
      surface_count: Arel.sql("surface_count + 1")
    )
  end

  def prewarm_cache(store, curation)
    presenter = CratePresenter.new(store)
    payload = {
      sections: presenter.build_storefront_sections(curation.storefront_groups),
      crates:   presenter.build_crates(curation.crates)
    }
    StorefrontCuration::CacheManager.write_curation_cache(store, payload)
  end
end
