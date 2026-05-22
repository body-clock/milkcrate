# Rewards listings with a distinct, high-resolution cover image. On crate pages
# and storefront grids, the cover image is the primary visual element — listings
# with good covers get more clicks, and stores that show real cover art rather
# than thumbnails look more professional.
#
# The scoring distinguishes three tiers:
#   +1.0 — distinct cover and thumbnail (likely a full-resolution scan)
#    0.0 — no image at all (neutral — the listing may still be good)
#   -1.0 — thumbnail only, or cover equals thumbnail (both indicate a
#           low-resolution or auto-generated placeholder)
#
# Cover == thumbnail is penalized because Discogs often falls back to the
# thumbnail URL when no full-size image exists — identical URLs signal "this
# listing has no real cover image" rather than a genuine high-quality scan.
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
