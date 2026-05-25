class DropDailySelections < ActiveRecord::Migration[8.1]
  def change
    drop_table :daily_selections do |t|
      t.references :store, null: false, foreign_key: true
      t.date :selected_on, null: false
      t.integer :listing_ids, array: true, default: []
      t.timestamps
    end
  end
end
