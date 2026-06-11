class AddLocationToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :location, :string
  end
end
