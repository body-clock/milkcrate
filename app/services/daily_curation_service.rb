class DailyCurationService
  def curate(store)
    curation = StorefrontCuration.new(store)
    surfaced = curation.surfaced_listings
    picks_count = curation.crates.find { |crate| crate.slug == "picks" }&.listings&.size || 0

    Listing.where(id: surfaced).update_all(
      last_surfaced_at: Time.current,
      surface_count: Arel.sql("surface_count + 1")
    )

    # Pre-warm the cache with fully-serialized presenter output
    presenter = CratePresenter.new(store)
    payload = {
      sections: presenter.build_storefront_sections(curation.storefront_groups),
      crates:   presenter.build_crates(curation.crates)
    }
    StorefrontCuration.write_curation_cache(store, payload)

    Rails.logger.info "[DailyCurationJob] store=#{store.name} surfaced=#{surfaced.size} picks=#{picks_count}"
  end
end
