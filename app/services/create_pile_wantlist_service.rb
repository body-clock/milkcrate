# Adds a shopper's pile items to their Discogs wantlist.
class CreatePileWantlistService
  Result = Data.define(:wantlist_url, :added_count, :skipped_count, :error) do
    def success? = error.nil?
  end

  def initialize(shopper:, item_ids:)
    @shopper = shopper
    @item_ids = item_ids
  end

  def call
    return error_result("No items in pile.") if @item_ids.blank?
    return error_result("Shopper not authenticated with Discogs.") unless @shopper.authenticated?

    release_ids = resolve_release_ids

    return error_result("No items could be added — none have release data.") if release_ids.empty?

    client = Discogs::ShopperWantlistClient.new(
      access_token: @shopper.oauth_token,
      access_token_secret: @shopper.oauth_token_secret
    )

    skipped_count = @item_ids.size - release_ids.size
    added_count = 0

    release_ids.each do |release_id|
      client.add_want(username: @shopper.discogs_username, release_id:)
      added_count += 1
    rescue Discogs::Errors::ApiError
      skipped_count += 1
    end

    @shopper.touch_last_used!

    Result.new(
      wantlist_url: "https://www.discogs.com/wantlist?user=#{@shopper.discogs_username}",
      added_count:,
      skipped_count:,
      error: nil
    )
  rescue Discogs::Errors::ApiError => e
    error_result("Discogs API error: #{e.message}")
  end

  private

  def resolve_release_ids
    listings = Listing.where(discogs_listing_id: @item_ids)
    listings.pluck(:discogs_release_id).compact.map(&:to_i).uniq
  end

  def error_result(message)
    Result.new(wantlist_url: nil, added_count: 0, skipped_count: 0, error: message)
  end
end
