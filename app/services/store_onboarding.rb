# Orchestrates the full store onboarding flow: OAuth, sync, and initial setup.
class StoreOnboarding
  Result = Data.define(:store)
  Error = Class.new(StandardError)

  def self.call(...) = new(...).call

  def initialize(discogs_username:, waitlist: nil, client: nil)
    @discogs_username = discogs_username.to_s.strip.downcase
    @waitlist = waitlist
    @client = client
  end

  def call
    raise Error, "Discogs username is required" if discogs_username.blank?
    raise Error, "Store already exists for #{discogs_username}" if Store.with_discogs_username(discogs_username).exists?

    profile = client.seller_profile(discogs_username)
    name = profile["name"].presence || discogs_username
    discogs_id = profile["id"] if profile["id"].is_a?(Integer)
    store = Store.create!(discogs_username:, name:, discogs_user_id: discogs_id)

    FullStoreSyncJob.perform_later(store.id)

    Result.new(store:)
  end

  private

  attr_reader :discogs_username, :waitlist

  def client
    @client ||= DiscogsClient.new
  end
end
