class CreateDigSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :dig_sessions do |t|
      t.string :name
      t.references :store, null: false, foreign_key: true
      t.string :status, null: false, default: "active"
      t.text :notes

      t.timestamps
    end

    add_index :dig_sessions, :status
  end
end
