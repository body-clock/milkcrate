class RemoveRotationOrderFromStores < ActiveRecord::Migration[8.1]
  def change
    remove_index :stores, :rotation_order, if_exists: true
    remove_column :stores, :rotation_order, :integer, default: 0, null: false
  end
end
