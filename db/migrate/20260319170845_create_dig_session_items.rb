class CreateDigSessionItems < ActiveRecord::Migration[8.1]
  def change
    create_table :dig_session_items do |t|
      t.references :dig_session, null: false, foreign_key: true
      t.references :listing, null: false, foreign_key: true

      t.timestamps
    end
  end
end
