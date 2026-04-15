require_relative "picks_selector"

class PickNarrative
  MAX_REASONS = 3
  VINTAGE_BEFORE = PicksSelector::VINTAGE_BEFORE
  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze

  def initialize(listing, genre_counts:)
    @listing = listing
    @genre_counts = genre_counts
  end

  def reasons(limit: MAX_REASONS)
    [
      discovery_styles_reason,
      crossover_reason,
      vintage_reason,
      rare_section_reason,
      condition_reason
    ].compact.first(limit)
  end

  private

  attr_reader :listing, :genre_counts

  def discovery_styles_reason
    matches = Array(listing.styles) & PicksSelector::DISCOVERY_STYLES
    return if matches.empty?

    "Discovery styles: #{matches.first(2).join(', ')}"
  end

  def crossover_reason
    genres = Array(listing.genres)
    return unless genres.size > 1

    "Genre crossover: #{genres.first(2).join(' + ')}"
  end

  def vintage_reason
    return unless listing.year && listing.year < VINTAGE_BEFORE

    "Vintage press: #{listing.year}"
  end

  def rare_section_reason
    genre = Array(listing.genres).first
    return if genre.nil?

    count = genre_counts.fetch(genre, 0)
    return unless count.positive? && count < 5

    "From a thin section: only #{count} #{genre} records in today's crate"
  end

  def condition_reason
    condition = listing.condition.to_s.strip
    return unless GOOD_CONDITIONS.include?(condition)

    "Clean copy: #{condition}"
  end
end
