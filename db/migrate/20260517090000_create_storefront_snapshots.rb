class CreateStorefrontSnapshots < ActiveRecord::Migration[8.1]
  def change
    create_table :storefront_snapshots do |t|
      t.references :store, null: false, foreign_key: true
      t.date :curation_date, null: false
      t.string :status, null: false, default: "generating"
      t.boolean :active, null: false, default: false
      t.integer :props_schema_version, null: false
      t.jsonb :crates, null: false, default: []
      t.jsonb :storefront_sections, null: false, default: []
      t.integer :surfaced_listing_ids, array: true, null: false, default: []
      t.datetime :generated_at
      t.datetime :failed_at
      t.text :failure_message
      t.jsonb :metrics, null: false, default: {}

      t.timestamps
    end

    add_index :storefront_snapshots, [ :store_id, :curation_date ]
    add_index :storefront_snapshots, [ :store_id, :status ]
    add_index :storefront_snapshots, [ :store_id, :props_schema_version ], name: "index_storefront_snapshots_on_store_and_schema"
    add_index :storefront_snapshots, :surfaced_listing_ids, using: :gin
    add_index :storefront_snapshots, :store_id, unique: true, where: "active", name: "index_storefront_snapshots_on_active_store"
  end
end
