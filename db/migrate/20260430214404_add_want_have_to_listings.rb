class AddWantHaveToListings < ActiveRecord::Migration[8.1]
  def change
    add_column :listings, :want_count, :integer
    add_column :listings, :have_count, :integer
  end
end
