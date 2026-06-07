# The Wall — the curated selection that represents the store's taste.
# Owns its own selection strategy, count, and dedup tracking.
class Wall
  attr_reader :crate

  def initialize(eligible_listings:, genre_counts:, curation_axis: GenresAxis.new)
    @eligible_listings = eligible_listings
    @genre_counts = genre_counts
    @curation_axis = curation_axis
    @crate = CuratedCrate.new(
      slug: "wall",
      name: "The Wall",
      listings: selected_listings
    )
  end

  # Set of listing IDs already claimed by the wall, for downstream dedup.
  def excluded_ids
    @excluded_ids ||= selected_listings.map(&:id).to_set
  end

  private

  def selected_listings
    @selected_listings ||= strategy.select(
      @eligible_listings,
      excluded_ids: Set.new,
      count: Settings.storefront.wall_count
    )
  end

  def strategy
    @strategy ||= CrateStrategies::Wall.new(genre_counts: @genre_counts, curation_axis: @curation_axis, today: Date.today)
  end
end
