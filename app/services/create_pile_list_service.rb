# Creates a private Discogs list from a shopper's pile items.
# Resolves release IDs from listing data, creates the list on the
# shopper's Discogs account, and adds each item.
class CreatePileListService
  Result = Data.define(:list_url, :added_count, :skipped_count, :error) do
    def success? = error.nil?
  end

  def initialize(shopper:, store_slug:, item_ids:)
    @shopper = shopper
    @store_slug = store_slug
    @item_ids = item_ids
  end

  def call
    return error_result("No items in pile.") if @item_ids.blank?
    return error_result("Shopper not authenticated with Discogs.") unless @shopper.authenticated?
    return error_result("Store not found.") if @store_slug.blank?

    store_name = resolve_store_name
    release_ids = resolve_release_ids

    return error_result("No items could be added to the list — none have release data.") if release_ids.empty?

    client = Discogs::ShopperListClient.new(
      access_token: @shopper.oauth_token,
      access_token_secret: @shopper.oauth_token_secret
    )

    list = client.create_list(
      name: "Picks from #{store_name}",
      description: "Records I found while browsing #{store_name} on Milkcrate"
    )

    skipped_count = @item_ids.size - release_ids.size
    added_count = 0

    release_ids.each do |release_id|
      client.add_item(list_id: list.list_id, release_id:)
      added_count += 1
    rescue Discogs::Errors::ApiError
      skipped_count += 1
    end

    @shopper.touch_last_used!

    Result.new(
      list_url: list.list_url,
      added_count:,
      skipped_count:,
      error: nil
    )
  rescue Discogs::Errors::ApiError => e
    error_result("Discogs API error: #{e.message}")
  end

  private

  def resolve_store_name
    store = Store.with_discogs_username(@store_slug).first
    store&.name || @store_slug
  end

  def resolve_release_ids
    listings = Listing.where(discogs_listing_id: @item_ids)
    listings.pluck(:discogs_release_id).compact.map(&:to_i).uniq
  end

  def error_result(message)
    Result.new(list_url: nil, added_count: 0, skipped_count: 0, error: message)
  end
end
