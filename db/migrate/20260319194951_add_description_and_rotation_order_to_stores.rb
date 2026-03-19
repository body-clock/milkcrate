class AddDescriptionAndRotationOrderToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :description, :text
    add_column :stores, :rotation_order, :integer, default: 0, null: false
    add_index :stores, :rotation_order
  end
end
