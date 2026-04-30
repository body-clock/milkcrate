class EnrichReleasesJob < ApplicationJob
  queue_as :default

  BATCH_SIZE = 50
  RATE_LIMIT_SLEEP = 1.0  # Discogs allows ~60 req/min authenticated

  def perform(store_id)
    store = Store.find(store_id)
    client = DiscogsClient.new

    release_ids = store.listings
      .where.not(discogs_release_id: nil)
      .pluck(:discogs_release_id)
      .uniq

    stale_release_ids = release_ids.reject do |rid|
      Release.find_by(discogs_release_id: rid)&.then { |r| !r.stale? }
    end

    Rails.logger.info "[EnrichReleasesJob] #{stale_release_ids.size} releases to enrich for store #{store.name}"

    stale_release_ids.each_slice(BATCH_SIZE) do |batch|
      batch.each do |release_id|
        enrich_release(client, release_id, store)
        sleep(RATE_LIMIT_SLEEP)
      rescue DiscogsClient::RateLimitError
        Rails.logger.warn "[EnrichReleasesJob] Rate limited on release #{release_id}, sleeping 60s"
        sleep(60)
        retry
      rescue DiscogsClient::ApiError => e
        Rails.logger.warn "[EnrichReleasesJob] API error for release #{release_id}: #{e.message}"
      end
    end
  end

  private

  def enrich_release(client, discogs_release_id, store)
    data = client.release(discogs_release_id)
    want = data.dig("community", "want").to_i
    have = data.dig("community", "have").to_i

    release = Release.find_or_initialize_by(discogs_release_id: discogs_release_id)
    release.update!(want_count: want, have_count: have, enriched_at: Time.current)

    store.listings
      .where(discogs_release_id: discogs_release_id)
      .update_all(want_count: want, have_count: have)
  end
end
