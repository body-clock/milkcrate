class AddProgressColumnsToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :sync_progress_pct, :integer
    add_column :stores, :enrichment_progress_pct, :integer
  end
end
