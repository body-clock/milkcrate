class AddPerformanceIndexes < ActiveRecord::Migration[8.1]
  def change
    add_index :listings, :last_seen_at
    add_index :listings, :discogs_release_id
    add_index :stores, :discogs_username, unique: true
  end
end
