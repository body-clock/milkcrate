class EnrichReleasesJob < ApplicationJob
  queue_as :default

  BATCH_SIZE = 50
  RATE_LIMIT_SLEEP = 1.1   # safe floor — Discogs allows 60 req/min authenticated
  RATE_LIMIT_LOW   = 5     # remaining threshold to pause briefly
  RATE_LIMIT_PAUSE = 10    # seconds to wait when nearly exhausted

  def perform(store_id, listing_ids: nil)
    store = Store.find(store_id)
    client = DiscogsClient.new

    scope = store.listings.where.not(discogs_release_id: nil)
    scope = scope.where(id: listing_ids) if listing_ids&.any?

    release_ids = scope.pluck(:discogs_release_id).uniq

    stale_release_ids = release_ids.reject do |rid|
      Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
    end

    Rails.logger.info "[EnrichReleasesJob] #{stale_release_ids.size} releases to enrich for store #{store.name}"

    stale_release_ids.each_slice(BATCH_SIZE) do |batch|
      batch.each do |release_id|
        remaining = enrich_release(client, release_id, store)
        if remaining <= RATE_LIMIT_LOW
          Rails.logger.info "[EnrichReleasesJob] Rate limit low (#{remaining} remaining), pausing #{RATE_LIMIT_PAUSE}s"
          sleep(RATE_LIMIT_PAUSE)
        else
          sleep(RATE_LIMIT_SLEEP)
        end
      rescue DiscogsClient::RateLimitError
        Rails.logger.warn "[EnrichReleasesJob] Rate limited on release #{release_id}, sleeping 15s"
        sleep(15)
        retry
      rescue DiscogsClient::ApiError => e
        Rails.logger.warn "[EnrichReleasesJob] API error for release #{release_id}: #{e.message}"
      end
    end
  end

  private

  def enrich_release(client, discogs_release_id, store)
    data, remaining = client.release(discogs_release_id)

    want    = data.dig("community", "want").to_i
    have    = data.dig("community", "have").to_i
    genres  = Array(data["genres"])
    styles  = Array(data["styles"])
    formats = Array(data["formats"])
    format_str  = formats.flat_map { |f| [ f["name"], *Array(f["descriptions"]) ] }.join(", ").presence
    cover_url   = extract_primary_image(data)
    tracklist   = extract_tracklist(data)

    now = Time.current
    Release.upsert(
      { discogs_release_id: discogs_release_id, want_count: want, have_count: have,
        enriched_at: now, discogs_image_missing: cover_url.nil?, created_at: now, updated_at: now },
      unique_by: :discogs_release_id,
      update_only: %i[want_count have_count enriched_at discogs_image_missing]
    )

    listing_updates = { want_count: want, have_count: have }
    listing_updates[:genres]          = genres     if genres.any?
    listing_updates[:styles]          = styles     if styles.any?
    listing_updates[:format]          = format_str if format_str
    listing_updates[:cover_image_url] = cover_url  if cover_url.present?
    listing_updates[:tracklist]       = tracklist  if tracklist.any?

    store.listings
      .where(discogs_release_id: discogs_release_id)
      .update_all(listing_updates)

    remaining
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
