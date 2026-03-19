class CreateStores < ActiveRecord::Migration[8.1]
  def change
    create_table :stores do |t|
      t.string :name
      t.string :discogs_username
      t.datetime :last_synced_at
      t.string :sync_status
      t.integer :total_listings

      t.timestamps
    end
  end
end
