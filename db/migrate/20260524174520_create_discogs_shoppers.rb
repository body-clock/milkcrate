class CreateDiscogsShoppers < ActiveRecord::Migration[8.1]
  def change
    create_table :discogs_shoppers do |t|
      t.string :discogs_username, null: false
      t.text :oauth_token
      t.text :oauth_token_secret
      t.string :store_slug
      t.datetime :last_used_at

      t.timestamps
    end

    add_index :discogs_shoppers, :discogs_username, unique: true
  end
end
