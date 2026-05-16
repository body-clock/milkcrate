class CreateLeads < ActiveRecord::Migration[8.1]
  def change
    create_table :leads do |t|
      t.string :discogs_username, null: false
      t.string :store_name
      t.jsonb :discogs_profile
      t.integer :inventory_size
      t.jsonb :sampled_listings
      t.integer :vinyl_count
      t.decimal :vinyl_percentage, precision: 5, scale: 2
      t.string :genres, array: true, default: []
      t.string :styles, array: true, default: []
      t.jsonb :web_presence
      t.decimal :score, precision: 8, scale: 2
      t.jsonb :score_breakdown
      t.string :status, default: "pending", null: false
      t.datetime :scored_at
      t.datetime :reviewed_at
      t.text :notes

      t.timestamps
    end

    add_index :leads, :discogs_username, unique: true
    add_index :leads, :status
    add_index :leads, :score
    add_index :leads, :genres, using: :gin
  end
end
