# frozen_string_literal: true

# Mark Component
class MarkComponent < ViewComponent::Base
  attr_accessor :mark

  def initialize(mark:)
    @mark = mark
  end

  def formatted_timestamp(timestamp)
    timestamp = timestamp.to_i
    [timestamp / 3600, timestamp / 60 % 60, timestamp % 60]
      .map(&:to_s)
      .map { |s| s.rjust(2, '0') }
      .join(':')
  end
end
