# Transforms Discogs API response data into listing attribute hashes.
module EnrichmentService::ListingDataTransforms
  def listing_updates(data)
    { want_count: data.dig("community", "want").to_i,
      have_count: data.dig("community", "have").to_i,
      genres: Array(data["genres"]).presence,
      styles: Array(data["styles"]).presence,
      format: format_label(data),
      cover_image_url: extract_primary_image(data),
      tracklist: extract_tracklist(data).presence }
      .compact
  end

  def format_label(data)
    Array(data["formats"])
      .flat_map { |f| [ f["name"], *Array(f["descriptions"]) ] }
      .join(", ").presence
  end

  def extract_primary_image(data)
    images = data["images"] || []
    primary = images.find { |img| img["type"] == "primary" } || images.first
    primary&.dig("uri")
  end

  def extract_tracklist(data)
    (data["tracklist"] || []).map do |track|
      { "position" => track["position"], "title" => track["title"] }
    end
  end
end
