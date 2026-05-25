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
    return error_result("No items in pile.") if @item_ids.blank?
    return error_result("Shopper not authenticated with Discogs.") unless @shopper.authenticated?

    release_ids = resolve_store_release_ids

    return error_result("No items could be added — none have release data.") if release_ids.empty?

    if release_ids.size > MAX_RELEASES_PER_ACTION
      return error_result("Too many unique releases (#{release_ids.size}). Maximum is #{MAX_RELEASES_PER_ACTION}.")
    end

    client = Discogs::ShopperWantlistClient.new(
      access_token: @shopper.oauth_token,
      access_token_secret: @shopper.oauth_token_secret
    )

    skipped_count = @item_ids.size - release_ids.size
    added_count = 0
    failures = 0

    release_ids.each do |release_id|
      sleep(1.2) if added_count > 0  # Pace requests to stay under Discogs 60 req/min quota
      client.add_want(username: @shopper.discogs_username, release_id:)
      added_count += 1
    rescue Discogs::Errors::RateLimitError
      # Stop on rate limiting — remaining releases are not attempted
      skipped_count += (release_ids.size - added_count - failures)
      Rails.logger.warn "[CreatePileWantlistService] Rate limited after #{added_count} adds (#{@store.discogs_username}, shopper #{@shopper.discogs_username})"
      break
    rescue Discogs::Errors::ApiError
      skipped_count += 1
      failures += 1
    end

    if added_count.zero?
      error_result("Could not add any releases to your Wantlist.")
    else
      wantlist_url = seller_wantlist_url
      @shopper.touch_last_used!
      Result.new(
        wantlist_url:,
        added_count:,
        skipped_count:,
        error: nil
      )
    end
  rescue Discogs::Errors::ApiError => e
    Rails.logger.warn "[CreatePileWantlistService] Discogs API error: #{e.message}"
    error_result("Something went wrong while contacting Discogs. Please try again.")
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
