# frozen_string_literal: true

class CreateRecords < ActiveRecord::Migration[7.1]
  def change
    create_table :records do |t|
      t.string :url
      t.string :title
      t.string :thumbnail
      t.references :crate, null: false, foreign_key: true

      t.timestamps
    end
  end
end
