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
    return 0.0 if no_image?(listing)
    return COVER_PENALTY if poor_image?(listing)

    COVER_BOOST
  end

  private

  def no_image?(listing)
    listing.cover_image_url.nil? && listing.thumbnail_url.nil?
  end

  def poor_image?(listing)
    listing.cover_image_url.nil? ||
      listing.thumbnail_url.nil? ||
      listing.cover_image_url == listing.thumbnail_url
  end
end
