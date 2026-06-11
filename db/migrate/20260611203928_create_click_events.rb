class CreateClickEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :click_events do |t|
      t.references :store, null: false, foreign_key: true
      t.references :listing, null: true, foreign_key: true
      t.string :referrer
      t.string :user_agent

      t.timestamps
    end
  end
end
