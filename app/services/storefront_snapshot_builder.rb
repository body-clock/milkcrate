class StorefrontSnapshotBuilder
  Result = Data.define(
    :crates,
    :storefront_sections,
    :surfaced_listing_ids,
    :metrics,
    :generated_at,
    :props_schema_version
  )

  def self.call(...) = new(...).call

  def initialize(store:, curation:, props_schema_version:)
    @store = store
    @curation = curation
    @props_schema_version = props_schema_version
  end

  def call
    generated_at = Time.current
    crates = curation.crates
    storefront_groups = curation.storefront_groups
    presenter = CratePresenter.new(store)

    serialized_crates = presenter.build_crates(crates)
    serialized_sections = presenter.build_storefront_sections(storefront_groups)
    surfaced_listing_ids = crates.flat_map(&:listings).map(&:id).uniq

    Result.new(
      crates: serialized_crates,
      storefront_sections: serialized_sections,
      surfaced_listing_ids:,
      metrics: {
        crate_count: crates.size,
        record_count: crates.sum { |crate| crate.listings.size },
        surfaced_count: surfaced_listing_ids.size,
        payload_bytes: JSON.generate({ crates: serialized_crates, storefront_sections: serialized_sections }).bytesize
      },
      generated_at:,
      props_schema_version: props_schema_version
    )
  end

  private

  attr_reader :store, :curation, :props_schema_version
end
