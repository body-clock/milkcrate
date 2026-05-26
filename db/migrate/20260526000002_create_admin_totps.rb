class CreateAdminTotps < ActiveRecord::Migration[8.0]
  def change
    create_table :admin_totps do |t|
      t.references :admin, null: false, foreign_key: true, index: false
      t.string :secret, null: false
      t.boolean :enabled, default: false, null: false
      t.datetime :last_used_at

      t.timestamps
    end

    add_index :admin_totps, :admin_id, unique: true
  end
end
