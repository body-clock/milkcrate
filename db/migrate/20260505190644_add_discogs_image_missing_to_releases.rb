class AddDiscogsImageMissingToReleases < ActiveRecord::Migration[8.1]
  def change
    add_column :releases, :discogs_image_missing, :boolean, default: false, null: false
  end
end
