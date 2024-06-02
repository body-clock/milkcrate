# frozen_string_literal: true

# Record Card
class RecordCardComponent < ViewComponent::Base
  attr_accessor :record

  def initialize(record:)
    @record = record
  end
end
