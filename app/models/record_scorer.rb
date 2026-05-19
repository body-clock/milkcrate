require "digest"

class RecordScorer
  VINTAGE_BEFORE = 1980
  SMALL_GENRE_THRESHOLD = 5
  SMALL_GENRE_BOOST = 3

  GOOD_CONDITIONS = %w[Mint NM M VG+].freeze
  CONDITION_ALIASES = {
    "near mint" => "NM",
    "m-" => "M",
    "mint-" => "M"
  }.freeze

  WANT_HAVE_HIGH_BONUS = 5.0
  WANT_HAVE_LOW_PENALTY = -2.0

  STALENESS_CURVE = [
    [ 3,  -5 ],
    [ 7,  -3 ],
    [ 14, -1 ]
  ].freeze

  NOISE_MAGNITUDE = 1.5

  COVER_BOOST = 1.0
  COVER_PENALTY = -1.0

  def initialize(genre_counts:, today: Date.today)
    @genre_counts = genre_counts
    @today = today
  end

  def score(listing)
    score_breakdown(listing).values.sum
  end

  def score_breakdown(listing)
    {
      vintage: vintage_points(listing),
      condition: condition_points(listing),
      section: section_points(listing),
      desirability: desirability_points(listing),
      metadata: metadata_penalty(listing),
      cover_quality: cover_quality_points(listing),
      freshness: freshness_score(listing),
      noise: daily_noise(listing)
    }
  end

  def good_condition?(listing)
    condition_points(listing).positive?
  end

  def desirable?(listing)
    WantHaveRatio.new(listing.want_count, listing.have_count).high?
  end

  private

  def vintage_points(listing)
    listing.year && listing.year < VINTAGE_BEFORE ? 2.0 : 0.0
  end

  def condition_points(listing)
    good = GOOD_CONDITIONS.include?(listing.condition&.strip) ||
           CONDITION_ALIASES.include?(listing.condition&.strip&.downcase)
    good ? 1.0 : 0.0
  end

  def section_points(listing)
    genre_count = @genre_counts.fetch(listing.primary_genre.to_s, 0)
    genre_count < SMALL_GENRE_THRESHOLD ? SMALL_GENRE_BOOST : 0.0
  end

  def desirability_points(listing)
    whr = WantHaveRatio.new(listing.want_count, listing.have_count)
    points = whr.log_base_score

    if whr.high?
      points += WANT_HAVE_HIGH_BONUS
    elsif whr.low?
      points += WANT_HAVE_LOW_PENALTY
    end

    points
  end

  def metadata_penalty(listing)
    listing.styles.empty? && listing.genres.size <= 1 && listing.year.nil? ? -1.0 : 0.0
  end

  def cover_quality_points(listing)
    cover = listing.cover_image_url
    thumb = listing.thumbnail_url

    return 0.0 if cover.nil? && thumb.nil?
    return COVER_PENALTY if cover.nil? || thumb.nil?
    return COVER_PENALTY if cover == thumb

    COVER_BOOST
  end

  def freshness_score(listing)
    return 3.0 if listing.last_surfaced_at.nil?

    days_ago = (@today - listing.last_surfaced_at.to_date).to_i

    STALENESS_CURVE.each do |threshold, penalty|
      return penalty.to_f if days_ago <= threshold
    end

    1.0
  end

  def daily_noise(listing)
    seed_str = "#{listing.id}-#{@today}"
    noise_unit = Digest::MD5.hexdigest(seed_str).to_i(16).to_f / (2**128)
    (noise_unit * 2 - 1) * NOISE_MAGNITUDE
  end
end
