# Adds a shopper's pile items to their Discogs wantlist, scoped to an
# originating store. Produces a seller-filtered Shop My Wants destination
# when the store has a validated Discogs profile identity.
#
# The operation is bounded (MAX_RELEASES_PER_ACTION) and reports partial
# outcomes honestly. A result with only residual skips but no successful
# writes does not produce a handoff URL.
class CreatePileWantlistService
  MAX_RELEASES_PER_ACTION = 50

  Result = Data.define(:wantlist_url, :added_count, :skipped_count, :error) do
    def success? = error.nil?
  end

  def initialize(shopper:, item_ids:, store:)
    @shopper = shopper
    @item_ids = item_ids
    @store = store
  end

  def call
    release_ids = validate_and_resolve
    return release_ids if release_ids.is_a?(Result)

    handle_result(add_to_wantlist(release_ids))
  rescue Discogs::Errors::ApiError => e
    handle_api_error(e)
  end

  def validate_and_resolve
    return error_result("No items in pile.") if @item_ids.blank?
    return error_result("Shopper not authenticated with Discogs.") unless @shopper.authenticated?
    resolve_store_release_ids.then { |ids| check_release_count(ids) }
  end

  def check_release_count(release_ids)
    return error_result("No items could be added - none have release data.") if release_ids.empty?
    return oversized_result(release_ids) if release_ids.size > MAX_RELEASES_PER_ACTION
    release_ids
  end

  def oversized_result(release_ids)
    error_result("Too many unique releases (#{release_ids.size}). Maximum is #{MAX_RELEASES_PER_ACTION}.")
  end

  def handle_api_error(error)
    log_api_error(error)
    error_result("Something went wrong while contacting Discogs. Please try again.")
  end

  def add_to_wantlist(release_ids)
    client = build_client
    stats = add_with_pacing(release_ids, client)
    stats
  end

  def build_client
    Discogs::ShopperWantlistClient.new(
      access_token: @shopper.oauth_token,
      access_token_secret: @shopper.oauth_token_secret
    )
  end

  def add_with_pacing(release_ids, client)
    stats = add_stats(release_ids)
    release_ids.each { |release_id| add_single(release_id, client, stats) }
    { added_count: stats[:added], skipped_count: stats[:skipped] }
  end

  def add_single(release_id, client, stats)
    attempt_add(release_id, client, stats)
  rescue Discogs::Errors::RateLimitError
    abort_on_rate_limit(stats)
  rescue Discogs::Errors::ApiError
    stats[:skipped] += 1
  end

  def attempt_add(release_id, client, stats)
    sleep(1.2) if stats[:added] > 0
    client.add_want(username: @shopper.discogs_username, release_id:)
    stats[:added] += 1
  end

  def abort_on_rate_limit(stats)
    Rails.logger.warn "[CreatePileWantlistService] Rate limited after #{stats[:added]} adds"
    raise StopIteration
  end

  def handle_result(stats)
    return error_result("Could not add any releases to your Wantlist.") if stats[:added_count].zero?

    @shopper.touch_last_used!
    Result.new(
      wantlist_url: seller_wantlist_url,
      added_count: stats[:added_count],
      skipped_count: stats[:skipped_count],
      error: nil
    )
  end

  def log_api_error(error)
    Rails.logger.warn "[CreatePileWantlistService] Discogs API error: #{error.message}"
  end

  private

  def resolve_store_release_ids
    @store.listings.where(discogs_listing_id: @item_ids)
      .pluck(:discogs_release_id).compact.map(&:to_i).uniq
  end

  def seller_wantlist_url
    return nil unless @store.discogs_user_id.present?

    "https://www.discogs.com/shop/mywants/?seller=#{@store.discogs_user_id}"
  end

  def error_result(message)
    Result.new(wantlist_url: nil, added_count: 0, skipped_count: 0, error: message)
  end
end
