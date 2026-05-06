class DropInventorySnapshotArtifacts < ActiveRecord::Migration[8.1]
  def change
    drop_table :inventory_snapshot_items, if_exists: true
    drop_table :inventory_snapshot_runs, if_exists: true
  end
end
