class CreateDailySelections < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_selections do |t|
      t.references :store, null: false, foreign_key: true
      t.date :selected_on, null: false
      t.integer :listing_ids, array: true, default: []

      t.timestamps
    end

    add_index :daily_selections, [ :store_id, :selected_on ], unique: true
    add_index :daily_selections, :listing_ids, using: :gin
  end
end
