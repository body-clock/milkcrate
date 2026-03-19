# @logical_path Milkcrate
class RecordCardComponentPreview < Lookbook::Preview
  # @label With cover image, not in pile
  def default
    render RecordCardComponent.new(listing: sample_listing, in_session: false)
  end

  # @label With cover image, in pile
  def in_pile
    render RecordCardComponent.new(listing: sample_listing, in_session: true)
  end

  # @label No cover image
  def no_image
    render RecordCardComponent.new(listing: sample_listing(cover: false), in_session: false)
  end

  # @label With tracklist
  def with_tracklist
    render RecordCardComponent.new(listing: sample_listing(tracklist: true), in_session: false)
  end

  private

  def sample_listing(cover: true, tracklist: false)
    Listing.new(
      id: 0,
      discogs_listing_id: "999999999",
      artist: "John Coltrane",
      title: "A Love Supreme",
      label: "Impulse!",
      year: 1965,
      condition: "VG+",
      price: 34.99,
      genres: [ "Jazz" ],
      styles: [ "Modal", "Free Jazz" ],
      cover_image_url: cover ? "https://i.discogs.com/placeholder.jpg" : nil,
      tracklist: tracklist ? [
        { "position" => "A1", "title" => "Acknowledgement" },
        { "position" => "A2", "title" => "Resolution" },
        { "position" => "B1", "title" => "Pursuance" },
        { "position" => "B2", "title" => "Psalm" }
      ] : []
    )
  end
end
