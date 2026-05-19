class ScoreStrategies::CoverQualityStrategy
  COVER_BOOST = 1.0
  COVER_PENALTY = -1.0

  def score(listing)
    cover = listing.cover_image_url
    thumb = listing.thumbnail_url

    return 0.0 if cover.nil? && thumb.nil?
    return COVER_PENALTY if cover.nil? || thumb.nil?
    return COVER_PENALTY if cover == thumb

    COVER_BOOST
  end
end
