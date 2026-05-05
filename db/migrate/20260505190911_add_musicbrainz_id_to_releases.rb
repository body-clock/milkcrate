class AddMusicbrainzIdToReleases < ActiveRecord::Migration[8.1]
  def change
    add_column :releases, :musicbrainz_id, :string
  end
end
