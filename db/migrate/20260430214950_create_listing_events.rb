class CreateListingEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :listing_events do |t|
      t.bigint :listing_id
      t.bigint :store_id
      t.string :event_type

      t.datetime :created_at, null: false
    end
    add_index :listing_events, :listing_id
    add_index :listing_events, :store_id
  end
end
