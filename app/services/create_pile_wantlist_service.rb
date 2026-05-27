# Service that adds a shopper's pile items to their Discogs Wantlist via OAuth.
class CreatePileWantlistService
  Result = Data.define(:wantlist_url, :added_count, :skipped_count, :error) do
    def success? = error.nil?
  end

  MAX_RELEASES_PER_ACTION = 50

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

  private

  def validate_and_resolve
    return error_result("No items in pile.") if @item_ids.blank?
    return error_result("Shopper not authenticated with Discogs.") unless @shopper.authenticated?
    resolve_store_release_ids.then { |ids| check_release_count(ids) }
  end

  def check_release_count(release_ids)
    return error_result("No items could be added.") if release_ids.empty?
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
    add_with_pacing(release_ids, client)
  end

  def build_client
    Discogs::ShopperWantlistClient.new(
      access_token: @shopper.oauth_token,
      access_token_secret: @shopper.oauth_token_secret
    )
  end

  def add_with_pacing(release_ids, client)
    stats = init_stats(release_ids)
    release_ids.each_with_index { |id, i| break unless add_one(id, client, stats, release_ids.size - i - 1) }
    { added_count: stats[:added], skipped_count: stats[:skipped] }
  end

  def add_one(release_id, client, stats, remaining)
    paced_add(release_id, client, stats)
  rescue Discogs::Errors::RateLimitError
    rate_limited(stats, remaining)
  rescue Discogs::Errors::ApiError
    stats[:skipped] += 1
  end

  def paced_add(release_id, client, stats)
    sleep(1.2) if stats[:added] > 0
    client.add_want(username: @shopper.discogs_username, release_id:)
    stats[:added] += 1
  end

  def rate_limited(stats, remaining)
    Rails.logger.warn "[CreatePileWantlistService] Rate limited after #{stats[:added]} adds"
    stats[:skipped] += 1 + remaining
    false
  end

  def init_stats(release_ids)
    { added: 0, skipped: @item_ids.size - release_ids.size, failures: 0 }
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

  def resolve_store_release_ids
    release_ids = @store.listings.where(discogs_listing_id: @item_ids)
      .pluck(:discogs_listing_id, :discogs_release_id).to_h

    @item_ids.filter_map { |item_id| release_ids[item_id]&.to_i }.uniq
  end

  def seller_wantlist_url
    return nil unless @store.discogs_user_id.present?
    "https://www.discogs.com/shop/mywants/?seller=#{@store.discogs_user_id}"
  end

  def error_result(message)
    Result.new(wantlist_url: nil, added_count: 0, skipped_count: 0, error: message)
  end
end
