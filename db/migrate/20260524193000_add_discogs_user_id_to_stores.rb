class AddDiscogsUserIdToStores < ActiveRecord::Migration[7.2]
  def change
    add_column :stores, :discogs_user_id, :bigint
    add_index :stores, :discogs_user_id, unique: true, where: "discogs_user_id IS NOT NULL"
  end
end
