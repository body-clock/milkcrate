class CreateStoreOwners < ActiveRecord::Migration[8.1]
  def change
    create_table :store_owners do |t|
      t.string :discogs_username, null: false
      t.text :discogs_oauth_token
      t.text :discogs_oauth_token_secret
      t.datetime :oauth_authorized_at
      t.string :owner_email

      t.timestamps
    end

    add_index :store_owners, :discogs_username, unique: true

    # Associate stores with their owner
    add_reference :stores, :store_owner, foreign_key: true

    # Remove OAuth columns from stores (now on store_owners)
    remove_column :stores, :discogs_oauth_token, :string
    remove_column :stores, :discogs_oauth_token_secret, :string
    remove_column :stores, :oauth_authorized_at, :datetime
    remove_column :stores, :owner_email, :string
  end
end
