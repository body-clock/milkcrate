# frozen_string_literal: true

class ChangeTimestampToFloatInMarks < ActiveRecord::Migration[7.1]
  def up
    change_column :marks, :timestamp, :float
  end

  def down
    change_column :marks, :timestamp, :integer
  end
end
