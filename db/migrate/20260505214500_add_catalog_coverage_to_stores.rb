class AddCatalogCoverageToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :catalog_coverage, :string, null: false, default: "unknown"
    add_column :stores, :inventory_page_count, :integer, null: false, default: 0
  end
end
