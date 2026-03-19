class CreateListings < ActiveRecord::Migration[8.1]
  def change
    create_table :listings do |t|
      t.references :store, null: false, foreign_key: true
      t.string :discogs_listing_id, null: false
      t.string :discogs_release_id
      t.string :artist
      t.string :title
      t.string :label
      t.integer :year
      t.string :format
      t.string :genres, array: true, default: []
      t.string :styles, array: true, default: []
      t.string :condition
      t.decimal :price, precision: 8, scale: 2
      t.string :currency, default: "USD"
      t.string :thumbnail_url
      t.string :cover_image_url
      t.jsonb :tracklist, default: []
      t.text :notes
      t.datetime :listed_at
      t.datetime :last_seen_at

      t.timestamps
    end

    add_index :listings, :discogs_listing_id, unique: true
    add_index :listings, :genres, using: :gin
    add_index :listings, :styles, using: :gin
    add_index :listings, :listed_at
  end
end
