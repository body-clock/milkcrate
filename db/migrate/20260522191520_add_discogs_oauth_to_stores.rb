class AddDiscogsOauthToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :discogs_oauth_token, :string
    add_column :stores, :discogs_oauth_token_secret, :string
    add_column :stores, :oauth_authorized_at, :datetime
    add_column :stores, :sync_source, :string, default: "public_api", null: false
    add_column :stores, :owner_email, :string
  end
end
