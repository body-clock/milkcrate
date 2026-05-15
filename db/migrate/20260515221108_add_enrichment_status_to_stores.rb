class AddEnrichmentStatusToStores < ActiveRecord::Migration[8.1]
  def change
    add_column :stores, :enrichment_status, :string, default: "idle", null: false
    add_column :stores, :last_enriched_at, :datetime
  end
end
