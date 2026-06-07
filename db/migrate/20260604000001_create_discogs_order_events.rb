class CreateDiscogsOrderEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :discogs_order_events do |t|
      t.references :store, null: false, foreign_key: true, index: false
      t.string :discogs_order_id, null: false
      t.string :status
      t.datetime :last_activity_at
      t.string :listing_ids, array: true, default: [], null: false
      t.integer :removed_listing_count, default: 0, null: false
      t.datetime :processed_at, null: false

      t.timestamps
    end

    add_index :discogs_order_events, [ :store_id, :discogs_order_id ], unique: true
    add_index :discogs_order_events, [ :store_id, :last_activity_at ]
  end
end
