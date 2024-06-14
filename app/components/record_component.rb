# frozen_string_literal: true

# Record Card
class RecordComponent < ViewComponent::Base
  attr_accessor :record

  def initialize(record:)
    @record = record
  end

  def formatted_timestamp(timestamp)
    timestamp = timestamp.to_i
    [timestamp / 3600, timestamp / 60 % 60, timestamp % 60]
      .map(&:to_s)
      .map { |s| s.rjust(2, '0') }
      .join(':')
  end
end
