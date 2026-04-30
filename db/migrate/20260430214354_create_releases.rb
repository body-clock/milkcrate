class CreateReleases < ActiveRecord::Migration[8.1]
  def change
    create_table :releases do |t|
      t.string :discogs_release_id
      t.integer :want_count
      t.integer :have_count
      t.datetime :enriched_at

      t.timestamps
    end
    add_index :releases, :discogs_release_id, unique: true
  end
end
