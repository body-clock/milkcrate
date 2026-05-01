class AddSurfacingToListings < ActiveRecord::Migration[8.1]
  def change
    add_column :listings, :last_surfaced_at, :datetime
    add_column :listings, :surface_count, :integer, default: 0, null: false
    add_index :listings, :last_surfaced_at
  end
end
