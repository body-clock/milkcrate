class AddAvatarUrlAndGenreTagsToStores < ActiveRecord::Migration[8.0]
  def change
    add_column :stores, :avatar_url, :string
    add_column :stores, :genre_tags, :text, array: true, default: []
  end
end
